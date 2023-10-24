"use client"
import styles from './styles';

interface inputProps {
  name: string; 
  type: string; 
  placeholder: string;
  handleChange: () => void; 
  label: string;
  custom?: boolean;
}

const Input = ({ name, type, placeholder, handleChange, label, custom }: inputProps) => {
  return (
    <div className='mt-4 w-full'>
      <label className={styles.label}>{label}</label>
      <input 
        type={type} 
        name={name} 
        placeholder={placeholder}
        onChange={handleChange}
        className={styles.input(custom)}
      />
    </div>
  )
}

export default Input