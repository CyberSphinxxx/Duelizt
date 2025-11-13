import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background-color: #1a1a1a;
    color: #fff;
    font-family: 'Poppins', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  h1, h2, h3 {
    font-weight: 700;
  }

  button {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    cursor: pointer;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 16px;
    transition: all 0.2s ease-in-out;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
  }

  input {
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    border: 2px solid #444;
    border-radius: 8px;
    padding: 12px;
    font-size: 16px;
    background-color: #333;
    color: #fff;
    outline: none;

    &:focus {
      border-color: #6c5ce7;
    }
  }
`;

export default GlobalStyle;
