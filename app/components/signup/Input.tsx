"use client"
import styles from './styles';

interface inputProps {
  name: string; 
  type: string;
  value: string; 
  placeholder: string;
  handleChange: (e: any) => void; 
  label: string;
  custom?: boolean;
};

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
        onChange={handleChange}
        className={styles.input(custom)}
      />
    </div>
  )
}

export default Input