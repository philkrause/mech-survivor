import React from 'react';
import './styles/App.css';
import Game from './components/Game';

// Define public paths for images
const headerImage = '/assets/images/ui/header.png';
//const borderImage = '/assets/images/ui/border.png';

const App: React.FC = () => {
  return (
    <div className="App">
      <main>
        <div className="game-border-container">
          {/* <img 
            src={borderImage} 
            alt="Game Border" 
            className="game-border"
          /> */}
          <div className="game-header">
            <img 
              src={headerImage} 
              alt="starwars-survivor" 
              className="header-image"
            />
          </div>
          <div className="game-container">
            <Game />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
