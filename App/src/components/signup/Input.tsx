"use client"
import styles from './styles';
import { inputProps } from './types';

const Input = ({ 
name, 
type, 
value, 
placeholder, 
handleChange, 
label, 
custom }: inputProps) => {

  return (
    <div className='mt-4 w-full'>
      <label className={styles.label}>{label}</label>
      <input 
        type={type} 
        value={value}
        name={name} 
        placeholder={placeholder}
        autoComplete="off"
        onChange={handleChange}
        className={styles.input(custom)}
      />
    </div>
  )
}

export default Input