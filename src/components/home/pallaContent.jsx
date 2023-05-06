import styles from '../../styles/page.module.css';
// import { PUBLIC_SITE_TITLE } from '../../server-constants';

function ContentBlock() {
  return (
    <div style={{ textAlign: 'center' }}>
      {/* <Image
              src="/hero-room.jpg"
              width={300}
              height={300}
              style={{ objectFit: 'contain', width: '100%' }}
              alt=""
            /> */}

      <div style={{ padding: '100px' }}>
        <h2
          style={{
            fontSize: '3.25em',
            lineHeight: '1.25',
            fontWeight: 'bold',
          }}
        >
          PUBLIC_SITE_TITLE
        </h2>
        <p
          style={{
            fontSize: '1em',
            lineHeight: '1.75',
            fontWeight: '400',
          }}
        >
          Aesthetic Cocumentarian
        </p>
      </div>
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
    </div>
  );
}
export default ContentBlock;
