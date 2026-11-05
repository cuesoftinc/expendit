package kafka

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	kgo "github.com/segmentio/kafka-go"
)

// fakeLag serves one topic's first and last offsets and a group's commits.
type fakeLag struct {
	first, last, committed map[int]int64
	err                    error
	mu                     sync.Mutex
}

func (f *fakeLag) commit(partition int, at int64) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.committed[partition] = at
}

func (f *fakeLag) Metadata(_ context.Context, req *kgo.MetadataRequest) (*kgo.MetadataResponse, error) {
	if f.err != nil {
		return nil, f.err
	}
	topic := kgo.Topic{Name: req.Topics[0]}
	for p := range f.last {
		topic.Partitions = append(topic.Partitions, kgo.Partition{ID: p})
	}
	return &kgo.MetadataResponse{Topics: []kgo.Topic{topic}}, nil
}

func (f *fakeLag) ListOffsets(_ context.Context, req *kgo.ListOffsetsRequest) (*kgo.ListOffsetsResponse, error) {
	res := &kgo.ListOffsetsResponse{Topics: map[string][]kgo.PartitionOffsets{}}
	for topic := range req.Topics {
		for p, last := range f.last {
			res.Topics[topic] = append(res.Topics[topic], kgo.PartitionOffsets{Partition: p, FirstOffset: f.first[p], LastOffset: last})
		}
	}
	return res, nil
}

func (f *fakeLag) OffsetFetch(_ context.Context, req *kgo.OffsetFetchRequest) (*kgo.OffsetFetchResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	res := &kgo.OffsetFetchResponse{Topics: map[string][]kgo.OffsetFetchPartition{}}
	for topic := range req.Topics {
		for p, at := range f.committed {
			res.Topics[topic] = append(res.Topics[topic], kgo.OffsetFetchPartition{Partition: p, CommittedOffset: at})
		}
	}
	return res, nil
}

func consumerOver(f *fakeLag) *Consumer {
	return &Consumer{topic: TopicResults, group: "expendit-common", lag: f, poll: 5 * time.Millisecond}
}

func TestCaughtUpComparesCommitsWithTheEndOfEveryPartition(t *testing.T) {
	cases := []struct {
		name string
		lag  *fakeLag
		want bool
	}{
		{"every partition committed to the end", &fakeLag{first: map[int]int64{0: 0, 1: 0}, last: map[int]int64{0: 3, 1: 5}, committed: map[int]int64{0: 3, 1: 5}}, true},
		{"one partition behind", &fakeLag{first: map[int]int64{0: 0, 1: 0}, last: map[int]int64{0: 3, 1: 5}, committed: map[int]int64{0: 3, 1: 4}}, false},
		{"never committed, messages waiting", &fakeLag{first: map[int]int64{0: 0}, last: map[int]int64{0: 2}, committed: map[int]int64{0: -1}}, false},
		{"never committed, topic empty", &fakeLag{first: map[int]int64{0: 0}, last: map[int]int64{0: 0}, committed: map[int]int64{0: -1}}, true},
		{"never committed, old messages trimmed", &fakeLag{first: map[int]int64{0: 9}, last: map[int]int64{0: 9}, committed: map[int]int64{0: -1}}, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := consumerOver(tc.lag).CaughtUp(context.Background())
			if err != nil || got != tc.want {
				t.Fatalf("CaughtUp = %v, %v; want %v", got, err, tc.want)
			}
		})
	}
}

func TestCaughtUpReportsABrokerError(t *testing.T) {
	boom := errors.New("broker away")
	if ok, err := consumerOver(&fakeLag{err: boom}).CaughtUp(context.Background()); ok || !errors.Is(err, boom) {
		t.Fatalf("CaughtUp = %v, %v; want false and the broker error", ok, err)
	}
}

func TestWaitCaughtUpReturnsOnceTheGroupCatchesUp(t *testing.T) {
	f := &fakeLag{first: map[int]int64{0: 0}, last: map[int]int64{0: 2}, committed: map[int]int64{0: 0}}
	go func() {
		time.Sleep(30 * time.Millisecond)
		f.commit(0, 2)
	}()
	if err := consumerOver(f).WaitCaughtUp(context.Background(), 5*time.Second); err != nil {
		t.Fatal(err)
	}
}

func TestWaitCaughtUpGivesUpAtTheBudget(t *testing.T) {
	f := &fakeLag{first: map[int]int64{0: 0}, last: map[int]int64{0: 2}, committed: map[int]int64{0: 0}}
	start := time.Now()
	if err := consumerOver(f).WaitCaughtUp(context.Background(), 50*time.Millisecond); err == nil {
		t.Fatal("want an error while the group is behind")
	}
	if time.Since(start) > 2*time.Second {
		t.Fatalf("waited %s past a 50 ms budget", time.Since(start))
	}
}
