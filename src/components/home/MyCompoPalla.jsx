import { Parallax, ParallaxLayer } from '@react-spring/parallax';

// import styles from '../../styles/home.module.css';
import ContentBlock from './pallaContent';
import ContentBlock02 from './pallaContent02';
import ContentBlock03 from './pallaContent03';
import ContentBlock04 from './pallaContent04';

import Artback from '/home/backdesk02.png';
import Jungle01 from '/home/block01.png';
import Jungle02 from '/home/block02.png';
import Jungle03 from '/home/block03.png';
import Jungle04 from '/home/block04.png';
import Jungle05 from '/home/block05.png';

function MyCompoPalla() {
  return (
    <div
      className="App"
      style={{
        width: '100%',
        height: '100%',
        background: '#f2edde',
      }}
    >
      <Parallax
        pages={6}
        style={{ top: '0', left: '0', background: '#f2edde' }}
        className="animation"
      >
        <ParallaxLayer offset={1} speed={1} style={{ display: 'flex' }}>
          <img
            src={Artback}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer
          offset={3.0}
          speed={1}
          style={{ backgroundColor: '#cf72ab', opacity: '0.1' }}
        />
        <ParallaxLayer
          offset={4.0}
          speed={1}
          style={{ backgroundColor: '#87BCDE', opacity: '0.1' }}
        />
        <ParallaxLayer
          offset={5.5}
          speed={1}
          style={{ backgroundColor: '#cf72ab', opacity: '0.1' }}
        />
        <ParallaxLayer offset={0} speed={0.1} style={{ display: 'flex' }}>
          <img
            src={Jungle01}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={0} speed={-0.2} style={{ display: 'flex' }}>
          <img
            src={Jungle02}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={0} speed={0.1} style={{ display: 'flex' }}>
          <img
            src={Jungle03}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={0} speed={-0.2} style={{ display: 'flex' }}>
          <img
            src={Jungle04}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={0} speed={0.3} style={{ display: 'flex' }}>
          <img
            src={Jungle05}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>

        <ParallaxLayer offset={0.6} speed={0.1} id="textblock">
          <ContentBlock />
        </ParallaxLayer>

        <ParallaxLayer offset={1.8} speed={0.1} style={{ display: 'flex' }}>
          <img
            src={Jungle01}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={2} speed={-0.1} style={{ display: 'flex' }}>
          <img
            src={Jungle02}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={1.8} speed={0.1} style={{ display: 'flex' }}>
          <img
            src={Jungle03}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={2} speed={0.3} style={{ display: 'flex' }}>
          <img
            src={Jungle04}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={1.8} speed={0.2} style={{ display: 'flex' }}>
          <img
            src={Jungle05}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>

        <ParallaxLayer offset={2} speed={1} id="textblock">
          <ContentBlock02 />
        </ParallaxLayer>

        <ParallaxLayer offset={3} speed={0.5} id="textblock">
          <ContentBlock03 />
        </ParallaxLayer>

        <ParallaxLayer offset={4.5} speed={0.5} id="textblock">
          <ContentBlock04 />
        </ParallaxLayer>

        <ParallaxLayer offset={4} speed={0.1} style={{ display: 'flex' }}>
          <img
            src={Jungle01}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={4} speed={-0.2} style={{ display: 'flex' }}>
          <img
            src={Jungle02}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={4} speed={0.3} style={{ display: 'flex' }}>
          <img
            src={Jungle03}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={4} speed={-0.2} style={{ display: 'flex' }}>
          <img
            src={Jungle04}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
        <ParallaxLayer offset={4} speed={0.1} style={{ display: 'flex' }}>
          <img
            src={Jungle05}
            className="animation_layer parallax"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          ></img>
        </ParallaxLayer>
      </Parallax>
    </div>
  );
}

MyCompoPalla.clientOnly = true;
export default MyCompoPalla;
