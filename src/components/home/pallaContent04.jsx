import styles from '../../styles/page.module.css';

function ContentBlock04() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className={styles.hr}></div>
      <div className={styles.buttonSection}>
        <div className={styles.buttonFlex}>
          <div
            style={{
              maxWidth: '100%',
            }}
          >
            <span>Contact</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ContentBlock04;
