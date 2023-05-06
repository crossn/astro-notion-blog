import styles from '../../styles/page.module.css';

function ContentBlock02() {
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
          <div style={{ width: '60%', textAlign: 'left' }}>
            <h3>About</h3>
            <p>
              テキストテキストテキストテキストテキストテキストテキストテキストテキストテキスト
            </p>
          </div>
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
          <div style={{ width: '60%', textAlign: 'left' }}>
            <h3>About</h3>
            <p>
              テキストテキストテキストテキストテキストテキストテキストテキストテキストテキスト
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ContentBlock02;
