'use strict';

const ServerConfig = {
    DEFAULT_FOOD_AMOUNT: 10,
    MIN_FPS: 8,
    STARTING_FPS: 8,
    MAX_FPS: 60,
    PLAYER_STARTING_LENGTH: 10,
    SPAWN_TURN_LEEWAY: 10,
    DEFAULT_STARTING_BOTS: 0,
    MAX_BOTS: 20,
    BOT_CHANGE_DIRECTION_PERCENT: 0.1,
    FOOD: {
        DEFAULT_AMOUNT: 10,
        NORMAL: {
            TYPE: 'NORMAL',
            COLOR: 'red',
            POINTS: 1,
            GROWTH: 1,
        },
        SUPER: {
            TYPE: 'SUPER',
            COLOR: 'green',
            POINTS: 5,
            GROWTH: 5,
            SPAWN_RATE: 0.1,
        },
        GOLDEN: {
            TYPE: 'GOLDEN',
            COLOR: 'yellow',
            POINTS: 25,
            GROWTH: 25,
            SPAWN_RATE: 0.01,
        },
        SWAP: {
            TYPE: 'SWAP',
            COLOR: 'blue',
            POINTS: 1,
            GROWTH: 1,
            SPAWN_RATE: 0.05,
        },
    },
    IO: {
        DEFAULT_CONNECTION: 'connection',
        INCOMING: {
            BOT_CHANGE: 'bot change',
            COLOR_CHANGE: 'player changed color',
            FOOD_CHANGE: 'food change',
            SPEED_CHANGE: 'speed change',
            START_LENGTH_CHANGE: 'start length change',
            JOIN_GAME: 'join game',
            SPECTATE_GAME: 'spectate game',
            CLEAR_UPLOADED_BACKGROUND_IMAGE: 'clear uploaded background image',
            BACKGROUND_IMAGE_UPLOAD: 'background image upload',
            CLEAR_UPLOADED_IMAGE: 'clear uploaded image',
            IMAGE_UPLOAD: 'image upload',
            NEW_PLAYER: 'new player',
            NAME_CHANGE: 'player changed name',
            KEY_DOWN: 'key down',
            DISCONNECT: 'disconnect',
        },
        OUTGOING: {
            NEW_STATE: 'game update',
            NEW_PLAYER_INFO: 'new player info',
            NEW_BACKGROUND_IMAGE: 'new background image',
            BOARD_INFO: 'board info',
            NOTIFICATION: 'server notification',
        },
    },
    INCREMENT_CHANGE: {
        INCREASE: 'increase',
        DECREASE: 'decrease',
        RESET: 'reset',
    },

};

module.exports = ServerConfig;