"use client"
import styles from './styles';


const Input = ({ name, type, placeholder, handleChange, label }) => {
  return (
    <div className='mt-4 w-full'>
      <label className={styles.label}>{label}</label>
      <input 
        type={type} 
        name={name} 
        placeholder={placeholder}
        onChange={handleChange}
        className={styles.input}
      />
    </div>
  )
}

export default Input