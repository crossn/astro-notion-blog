import Tmg from '/home/tmg-fb.png';
import Palette from '/home/palette.png';
import Saiban from '/home/saiban02.png';
import Dammy from '/home/tegaki-note02.jpg';

import styles from '../../styles/page.module.css';

function ContentBlock03() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className={styles.buttonSection}>
        <div className={styles.buttonFlex}>
          <div
            style={{
              maxWidth: '100%',
            }}
          >
            <span>Work</span>
          </div>
        </div>
      </div>

      <div className={styles.hr}></div>
      <div
        style={{
          backgroundColor: 'rgba(31,33,49,0.3)',
          fontSize: '0.75rem',
          height: '1.375rem',
          lineHeight: '1.375rem',
          width: '100%',
          position: 'relative',
          display: 'flex',
          padding: '0 0.6rem',
          color: '#e6eb2f',
        }}
      >
        <span
          style={{
            borderTop: 'dashed 2px',
            height: 'inherit',
            flexGrow: '1',
            position: 'relative',
            top: 'calc(50% - 1px)',
          }}
        >
          &nbsp;
        </span>
        <span style={{ padding: '0 0.6rem' }}>#work</span>
        <span
          style={{
            borderTop: 'dashed 2px',
            height: 'inherit',
            flexGrow: '1',
            position: 'relative',
            top: 'calc(50% - 1px)',
          }}
        >
          &nbsp;
        </span>
      </div>

      <div className={styles.sectionContainer}>
        <div className={styles.sectionContainer}>
          <a
            href="https://suzuri.jp/crossn/digital_products/4871"
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexBasis: '40%', padding: '1%' }}
          >
            <img src={Tmg} style={{ width: '100%', objectFit: 'cover' }}></img>
          </a>
          <a
            href="https://suzuri.jp/crossn/digital_products/7685"
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexBasis: '40%', padding: '1%' }}
          >
            <img
              src={Palette}
              style={{ width: '100%', objectFit: 'cover' }}
            ></img>
          </a>
        </div>
      </div>
      <div className={styles.sectionContainer}>
        <div className={styles.sectionContainer}>
          <a
            href="https://suzuri.jp/crossn/digital_products/7686"
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexBasis: '40%', padding: '1%' }}
          >
            <img
              src={Saiban}
              style={{ width: '100%', objectFit: 'cover' }}
            ></img>
          </a>
          <a
            href=""
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexBasis: '40%', padding: '1%' }}
          >
            <img
              src={Dammy}
              style={{ width: '100%', objectFit: 'cover' }}
            ></img>
          </a>
        </div>
      </div>
    </div>
  );
}
export default ContentBlock03;
