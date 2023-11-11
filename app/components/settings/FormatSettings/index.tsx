import React, {useState} from 'react'
import styles from './styles'

type FormatSettingsProps = {};

const Index: React.FC<FormatSettingsProps> = () => {
  const [selectedDateFormat, setSelectedDateFormat] = useState<string>('yyyy-MM-dd');
  const [selectedCurrencyFormat, setSelectedCurrencyFormat] = useState<string>('₦');

  const handleDateFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDateFormat(e.target.value);
  };

  const handleCurrencyFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCurrencyFormat(e.target.value);
  };

  return (
    <div className={styles.pagePad}>
      <section>
        <div className={styles.section}>
          <div>
            <h1 className={styles.semibold}>Format settings</h1>
            <p className={styles.paragraph}>Update your date and currency format here</p>
          </div>
          <div className={styles.buttonContainer}>
            <button className={styles.button}>Cancel</button>
            <button className={styles.changeButton}>Save Changes</button>
          </div>
        </div>
      </section>
      <section className={styles.formatContainer}>
        <h2 className={styles.format}>Date Format</h2>
        <div className="mb-4">
          <label className={styles.label}>Select Date Format:</label>
          <select
            className={styles.select}
            value={selectedDateFormat}
            onChange={handleDateFormatChange}
          >
            <option value="yyyy-MM-dd">yyyy-MM-dd</option>
            <option value="MM/dd/yyyy">MM/dd/yyyy</option>
            <option value="dd-MM-yyyy">dd-MM-yyyy</option>
            <option value="MM/yyyy">MM/yyyy</option>
          </select>
        </div>
        <p className={styles.display}>
          Selected Date Format: <strong>{selectedDateFormat}</strong>
        </p>
      </section>
      <section className={styles.formatContainer}>
        <h2 className={styles.format}>Currency Format</h2>
        <div className="mb-4">
          <label className={styles.label}>Select Currency Format:</label>
          <select
            className={styles.select}
            value={selectedCurrencyFormat}
            onChange={handleCurrencyFormatChange}
          >
            <option value="₦">₦ (Naira)</option>
            <option value="$">$ (Dollar)</option>
            <option value="€">€ (Euro)</option>
            <option value="£">£ (Pound)</option>
            <option value="¥">¥ (Yen)</option>
          </select>
        </div>
        <p className={styles.display}>
          Selected Currency Format: <strong>{selectedCurrencyFormat}</strong>
        </p>
      </section>
    </div>
  )
}

export default Index
