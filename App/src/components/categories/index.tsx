"use client"

import { useCategoryCustomState } from "./states"
import {styles} from "./styles"

const Index = () => {
  const {
    handleDelete,
    handleEdit,
    handleInput,
    handleEditInput,
    handleSubmit,
    memoizedItems,
    input,
    setSelectedItemIndex,
    selectedItemIndex,
    editedItem,
  } = useCategoryCustomState();

  return (
    <main className="mt-4 p-10">
        <h1 className={styles.title}>Categories</h1>
        <div className={styles.wrapper}>
          <section className={`${styles.section} min-h-[300px]`}>
            <div className='border-b-2 pb-2'>
              <h2 className={styles.heading}>Delete Category</h2>
              <select
                className={styles.select}
                onChange={(e) => setSelectedItemIndex(parseInt(e.target.value, 10))}
                value={selectedItemIndex !== null ? selectedItemIndex.toString() : ""}
              >
                <option value="">Choose a category</option>
                {memoizedItems.map((item, index) => (
                  <option key={index} value={index.toString()}>
                    {item.name}
                  </option>
                ))}
              </select>
              <div className={styles.button}>
                <button onClick={handleDelete}>Delete</button>
              </div>
            </div>
            <div>
              <h2 className={`${styles.heading} mt-10`}>Edit Category</h2>
              <input
                onChange={handleEditInput}
                type="text"
                className='rounded-lg my-10 px-2 py-2 bg-[#EDEEF9] shadow-inner w-full'
                placeholder='Rename category'
                value={editedItem}
              />
              <div className={styles.button}>
                <button onClick={handleEdit}>Edit</button>
              </div>
            </div>
          </section>
          <section className={`${styles.section} max-h-[300px]`}>
            <h2 className={styles.heading}>Create a new category</h2>
            <input value={input} onChange={handleInput} type="text" className='rounded-lg my-12 px-2 py-2 bg-[#EDEEF9] shadow-inner w-full' placeholder='Add new category'/>
            <div onClick={handleSubmit} className={styles.button}>
              <button>Upload</button>
            </div>
          </section>
        </div>
      </main>
  )
}

export default Index