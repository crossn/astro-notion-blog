import styles from '../../styles/page.module.css';

function ContentBlock03() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className={styles.sectionContainer}>
        <div className={styles.sectionContainer}>
          <div
            style={{
              height: '300px',
              backgroundColor: '#dfdddd',
              width: '40%',
            }}
          ></div>
          <div
            style={{
              height: '300px',
              backgroundColor: '#dfdddd',
              width: '40%',
              marginLeft: '20px',
            }}
          ></div>
        </div>
      </div>
      <div className={styles.sectionContainer}>
        <div className={styles.sectionContainer}>
          <div
            style={{
              height: '300px',
              backgroundColor: '#dfdddd',
              width: '40%',
            }}
          ></div>
          <div
            style={{
              height: '300px',
              backgroundColor: '#dfdddd',
              width: '40%',
              marginLeft: '20px',
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
export default ContentBlock03;
