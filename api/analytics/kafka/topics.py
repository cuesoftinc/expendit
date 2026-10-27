"""Events and topics (S-13; system-design.md §16 I-18). Schemas for each
event live in api/common/contract.

An event names the envelope's `type` and its schema. Topics are the three
lanes of the CueLABS shared message bus (the delivery standard's
shared-messaging.md): every product reads and writes them, so a consumer
reads the type first and skips whatever isn't one of its own events.
"""

PRODUCT = "expendit."

# Events.
UPLOAD_RECEIVED = "expendit.upload.received"
IMPORT_READY = "expendit.import.ready"
STATEMENT_READY = "expendit.statement.ready"
IMPORT_PROCESSED = "expendit.import.processed"
STATEMENT_MAPPED = "expendit.statement.mapped"
COMPUTE_REQUESTED = "expendit.compute.requested"
COMPUTE_RESULTS = "expendit.compute.results"
# Sent by common's reaper every 6 hours so the shared Aiven Kafka never idles
# for 24 hours (system-design.md §16 I-17). The compute pool drops it.
HEARTBEAT = "expendit.system.heartbeat"

# The schema of one tax rule set. Not a topic: tax compute requests carry
# the current sets in `rulesets`.
CONFIG_RULESETS = "expendit.config.rulesets"

# Topics: the shared bus's lanes.
TOPIC_UPLOADS = "cuelabs.uploads"
TOPIC_REQUESTS = "cuelabs.requests"
TOPIC_RESULTS = "cuelabs.results"

TOPIC_FOR = {
    UPLOAD_RECEIVED: TOPIC_UPLOADS,
    IMPORT_READY: TOPIC_REQUESTS,
    STATEMENT_READY: TOPIC_REQUESTS,
    COMPUTE_REQUESTED: TOPIC_REQUESTS,
    HEARTBEAT: TOPIC_REQUESTS,
    IMPORT_PROCESSED: TOPIC_RESULTS,
    STATEMENT_MAPPED: TOPIC_RESULTS,
    COMPUTE_RESULTS: TOPIC_RESULTS,
}
