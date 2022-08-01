import ClientConfig from '../config/client-config.js';
import AudioController from './audio-controller.js';
import TextToDraw from '../model/text-to-draw.js';
import CanvasFactory from '../view/canvas-factory.js';
import GameView from '../view/game-view.js';

/**
 * Controls all game logic
 */
export default class GameController {
    constructor() {
        this.gameView = new GameView(this.backgroundImageUploadCallback.bind(this),
                                     this.botChangeCallback.bind(this),
                                     this.foodChangeCallback.bind(this),
                                     this.imageUploadCallback.bind(this),
                                     this.joinGameCallback.bind(this),
                                     this.keyDownCallback.bind(this),
                                     this.muteAudioCallback.bind(this),
                                     this.playerColorChangeCallback.bind(this),
                                     this.playerNameUpdatedCallback.bind(this),
                                     this.spectateGameCallback.bind(this),
                                     this.speedChangeCallback.bind(this),
                                     this.startLengthChangeCallback.bind(this),
                                     this.toggleGridLinesCallback.bind(this)
                                     );
        this.audioController = new AudioController();
        this.players = [];
        this.food = {};
        this.textsToDraw = [];
        this.walls = [];
    }

    connect(io) {
        this.socket = io();
        this._initializeSocketIoHandlers();
        const storedName = localStorage.getItem(ClientConfig.LOCAL_STORAGE.PLAYER_NAME);
        const storedBase64Image = localStorage.getItem(ClientConfig.LOCAL_STORAGE.PLAYER_IMAGE);
        this.socket.emit(ClientConfig.IO.OUTGOING.NEW_PLAYER, storedName, storedBase64Image);
    }

    renderGame() {
        this.canvasView.clear();
        for (const foodId of Object.keys(this.food)) {
            if ({}.hasOwnProperty.call(this.food, foodId)) {
                const food = this.food[foodId];
                this.canvasView.drawSquare(food.coordinate, food.color);
            }
        }

        this.canvasView.drawSquares(this.walls, ClientConfig.WALL_COLOR);

        for (const player of this.players) {
            if (player.segments.length === 0) {
                continue;
            }
            // Flash around where you have just spawned
            if (`/#${this.socket.id}` === player.id &&
                    player.moveCounter <= ClientConfig.TURNS_TO_FLASH_AFTER_SPAWN &&
                    player.moveCounter % 2 === 0) {
                this.canvasView.drawSquareAround(player.segments[0], ClientConfig.SPAWN_FLASH_COLOR);
            }

            if (player.base64Image) {
                this.canvasView.drawImages(player.segments, player.base64Image);
            } else {
                this.canvasView.drawSquares(player.segments, player.color);
            }
        }

        for (let i = this.textsToDraw.length - 1; i >= 0; i--) {
            const textToDraw = this.textsToDraw[i];
            if (textToDraw.counter === ClientConfig.TURNS_TO_SHOW_FOOD_TEXT) {
                this.textsToDraw.splice(i, 1);
            } else {
                this.canvasView.drawFadingText(textToDraw, ClientConfig.TURNS_TO_SHOW_FOOD_TEXT);
                textToDraw.incrementCounter();
            }
        }

        const self = this;
        // Run in a loop
        setTimeout(() => {
            requestAnimationFrame(self.renderGame.bind(self));
        }, 1000 / ClientConfig.FPS);
    }

    /*******************
     *  View Callbacks *
     *******************/

    botChangeCallback(option) {
        this.socket.emit(ClientConfig.IO.OUTGOING.BOT_CHANGE, option);
    }

    foodChangeCallback(option) {
        this.socket.emit(ClientConfig.IO.OUTGOING.FOOD_CHANGE, option);
    }

    backgroundImageUploadCallback(image, imageType) {
        if (!(image && imageType)) {
            this.socket.emit(ClientConfig.IO.OUTGOING.CLEAR_UPLOADED_BACKGROUND_IMAGE);
            return;
        }
        const resizedBase64Image = this.canvasView.resizeUploadedBackgroundImageAndBase64(image, imageType);
        this.socket.emit(ClientConfig.IO.OUTGOING.BACKGROUND_IMAGE_UPLOAD, resizedBase64Image);
    }

    canvasClicked(x, y) {
        this.socket.emit(ClientConfig.IO.OUTGOING.CANVAS_CLICKED, x, y);
    }

    // optional resizedBase64Image
    imageUploadCallback(image, imageType, resizedBase64Image) {
        if (!(image && imageType)) {
            this.socket.emit(ClientConfig.IO.OUTGOING.CLEAR_UPLOADED_IMAGE);
            localStorage.removeItem(ClientConfig.LOCAL_STORAGE.PLAYER_IMAGE);
            return;
        }
        let newResizedBase64Image;
        if (resizedBase64Image) {
            newResizedBase64Image = resizedBase64Image;
        } else {
            newResizedBase64Image = this.canvasView.resizeUploadedImageAndBase64(image, imageType);
        }
        this.socket.emit(ClientConfig.IO.OUTGOING.IMAGE_UPLOAD, newResizedBase64Image);
        localStorage.setItem(ClientConfig.LOCAL_STORAGE.PLAYER_IMAGE, newResizedBase64Image);
    }

    joinGameCallback() {
        navigator.bluetooth.requestDevice({ filters: [{ name: ['CapSense Button Slider'] }], optionalServices: ['0003cab5-0000-1000-8000-00805f9b0131'] })
            .then(device => device.gatt.connect())
            .then(server => server.getPrimaryService('0003cab5-0000-1000-8000-00805f9b0131'))
            .then(service => service.getCharacteristic('0003caa3-0000-1000-8000-00805f9b0131'))
            // .then(server => server.getPrimaryService('0003cab5-0000-1000-8000-00805f9b0131'))
            // .then(service => service.getCharacteristic('0003caa2-0000-1000-8000-00805f9b0131'))
            .then(characteristic => {
                characteristic.addEventListener("characteristicvaluechanged", this.capsenseNotificationCallback.bind(this));
                characteristic.startNotifications();
            })

            .then(value => {
                console.log(value);
            })
            .catch(error => { console.error(error); });
        this.socket.emit(ClientConfig.IO.OUTGOING.JOIN_GAME);
    }

    keyDownCallback(keyCode) {
        this.socket.emit(ClientConfig.IO.OUTGOING.KEY_DOWN, keyCode);
    }

    capsenseNotificationCallback(event) {
        if (Date.now() - this.lastCapsenseUpdate < 50) {
            return;
        }
        this.lastCapsenseUpdate = Date.now();
        let value = event.target.value.getUint8(1);
        let keyCode;
        let direction = this.players[0].direction;
        if (direction.x == 1) {// snake runs right
            if (value > 1) {
                keyCode = 38; // UP
            }
            else {
                keyCode = 40; // DOWN
            }
        }
        else if (direction.x == -1) {// snake runs left
            if (value > 1) {
                keyCode = 40; // DOWN
            }
            else {
                keyCode = 38; // UP
            }
        }
        else if (direction.y == 1) { // snake runs down
            if (value > 1) {
                keyCode = 39; // RIGHT
            }
            else {
                keyCode = 37; // LEFT
            }
        }
        else if (direction.y == -1) { // snake runs up
            if (value > 1) {
                keyCode = 37; // LEFT
            }
            else {
                keyCode = 39; // RIGHT
            }
        }
        console.log(event);
        console.log(`${direction.x}, ${direction.y} + ${event.target.value.getUint8(0)} ${event.target.value.getUint8(1)} ${event.target.value.getUint8(2)} => ${keyCode}`);
        this.socket.emit(ClientConfig.IO.OUTGOING.KEY_DOWN, keyCode);
    }

    muteAudioCallback() {
        this.audioController.toggleMute();
        this.gameView.setMuteStatus(this.audioController.isMuted);
    }

    playerColorChangeCallback() {
        this.socket.emit(ClientConfig.IO.OUTGOING.COLOR_CHANGE);
    }

    playerNameUpdatedCallback(name) {
        this.socket.emit(ClientConfig.IO.OUTGOING.NAME_CHANGE, name);
        localStorage.setItem(ClientConfig.LOCAL_STORAGE.PLAYER_NAME, name);
    }

    spectateGameCallback() {
        this.socket.emit(ClientConfig.IO.OUTGOING.SPECTATE_GAME);
    }

    speedChangeCallback(option) {
        this.socket.emit(ClientConfig.IO.OUTGOING.SPEED_CHANGE, option);
    }

    startLengthChangeCallback(option) {
        this.socket.emit(ClientConfig.IO.OUTGOING.START_LENGTH_CHANGE, option);
    }

    toggleGridLinesCallback() {
        this.canvasView.toggleGridLines();
    }

    /*******************************
     *  socket.io handling methods *
     *******************************/

    _createBoard(board) {
        this.canvasView =
            CanvasFactory.createCanvasView(
                board.SQUARE_SIZE_IN_PIXELS, board.HORIZONTAL_SQUARES, board.VERTICAL_SQUARES, this.canvasClicked.bind(this));
        this.canvasView.clear();
        this.gameView.ready();
        this.renderGame();
    }

    _handleBackgroundImage(backgroundImage) {
        if (backgroundImage) {
            this.canvasView.setBackgroundImage(backgroundImage);
        } else {
            this.canvasView.clearBackgroundImage();
        }
    }

    _handleFoodCollected(text, coordinate, color, isSwap) {
        this.textsToDraw.unshift(new TextToDraw(text, coordinate, color));
        if (isSwap) {
            this.audioController.playSwapSound();
        } else {
            this.audioController.playFoodCollectedSound();
        }
    }

    _handleNewGameData(gameData) {
        this.players = gameData.players;
        this.food = gameData.food;
        this.walls = gameData.walls;
        this.gameView.showFoodAmount(Object.keys(gameData.food).length);
        this.gameView.showSpeed(gameData.speed);
        this.gameView.showStartLength(gameData.startLength);
        this.gameView.showNumberOfBots(gameData.numberOfBots);
        this.gameView.showPlayerStats(gameData.playerStats);
    }


    _initializeSocketIoHandlers() {
        this.socket.on(ClientConfig.IO.INCOMING.NEW_PLAYER_INFO, this.gameView.updatePlayerName);
        this.socket.on(ClientConfig.IO.INCOMING.BOARD_INFO, this._createBoard.bind(this));
        this.socket.on(ClientConfig.IO.INCOMING.NEW_STATE, this._handleNewGameData.bind(this));
        this.socket.on(ClientConfig.IO.INCOMING.NEW_BACKGROUND_IMAGE, this._handleBackgroundImage.bind(this));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.FOOD_COLLECTED, this._handleFoodCollected.bind(this));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.GENERAL, this.gameView.showNotification);
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.KILL, this.gameView.showKillMessage.bind(this.gameView));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.KILLED_EACH_OTHER,
            this.gameView.showKilledEachOtherMessage.bind(this.gameView));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.RAN_INTO_WALL,
            this.gameView.showRanIntoWallMessage.bind(this.gameView));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.SUICIDE, this.gameView.showSuicideMessage.bind(this.gameView));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.YOU_DIED,
            this.audioController.playDeathSound.bind(this.audioController));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.YOU_MADE_A_KILL,
            this.audioController.playKillSound.bind(this.audioController));
    }
}

export class BlePlayer {
    constructor(device, gameController) {
        this.socket = io();
        this.gameController = gameController;
        this.device = device;
        this.lastCapsenseUpdate = Date.now();
        this.socket.emit(ClientConfig.IO.OUTGOING.NEW_PLAYER);
        this.reconnect();
    }

    reconnect() {
        this.device.gatt.connect()
            .then(server => server.getPrimaryService('0003cab5-0000-1000-8000-00805f9b0131'))
            .then(service => service.getCharacteristic('0003caa3-0000-1000-8000-00805f9b0131'))
            .then(characteristic => {
                characteristic.addEventListener("characteristicvaluechanged", this.capsenseNotificationCallback.bind(this));
                characteristic.startNotifications();
                this.socket.emit(ClientConfig.IO.OUTGOING.JOIN_GAME);
            })
            .catch(error => {
                console.error(error);
            });
    }

    capsenseNotificationCallback(event) {
        if (Date.now() - this.lastCapsenseUpdate < 50) {
            return;
        }
        this.lastCapsenseUpdate = Date.now();
        let value = event.target.value.getUint8(1);
        let keyCode;
        let direction = this.gameController.players.find(player => player.id == this.socket.id).direction;
        if (direction.x == 1) {// snake runs right
            if (value > 1) {
                keyCode = 38; // UP
            }
            else {
                keyCode = 40; // DOWN
            }
        }
        else if (direction.x == -1) {// snake runs left
            if (value > 1) {
                keyCode = 40; // DOWN
            }
            else {
                keyCode = 38; // UP
            }
        }
        else if (direction.y == 1) { // snake runs down
            if (value > 1) {
                keyCode = 39; // RIGHT
            }
            else {
                keyCode = 37; // LEFT
            }
        }
        else if (direction.y == -1) { // snake runs up
            if (value > 1) {
                keyCode = 37; // LEFT
            }
            else {
                keyCode = 39; // RIGHT
            }
        }
        console.log(`${direction.x}, ${direction.y} + ${event.target.value.getUint8(0)} ${event.target.value.getUint8(1)} ${event.target.value.getUint8(2)} => ${keyCode}`);
        if (keyCode)
            this.socket.emit(ClientConfig.IO.OUTGOING.KEY_DOWN, keyCode);
    }
}

export class BleObserver {
    constructor(gameController) {
        this.gameController = gameController;
        this.blePlayers = {}
        setInterval(this.observeBle.bind(this), 1000);
    }

    async observeBle() {
        let devices = await navigator.bluetooth.getDevices()
        await devices.forEach(async device => {
            if (device.gatt.connected == true) {
                return;
            }
            await device.watchAdvertisements();
            await new Promise(r => setTimeout(r, 100));
            await new Promise(() => {
                this.createOrReconnectPlayer(device);
            });
        });
    }

    createOrReconnectPlayer(device) {
        if (device.id in this.blePlayers) {
            console.log(`Reconnect ${device.id}`);
            this.blePlayers[device.id].reconnect();
        }
        else {
            console.log(`Create ${device.id}`);
            this.blePlayers[device.id] = new BlePlayer(device, this.gameController);
        }
    }
}
