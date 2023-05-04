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
    </div>
  );
}
export default ContentBlock;
