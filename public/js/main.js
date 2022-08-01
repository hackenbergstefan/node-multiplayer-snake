import GameController, { BleObserver } from './controller/game-controller.js';

const gameController = window.gameController = new GameController();
/* global io */
// io is a global variable for socket.io-client set from the view html
gameController.connect(io);

window.bleObserver = new BleObserver(gameController);
