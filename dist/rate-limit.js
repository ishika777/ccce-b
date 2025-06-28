"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFolderRL = exports.deleteFolderRL = exports.deleteFileRL = exports.renameFileRL = exports.createFileRL = exports.saveFileRL = exports.MAX_BODY_SIZE = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
exports.MAX_BODY_SIZE = 5 * 1024 * 1024;
exports.saveFileRL = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 3,
    duration: 1,
});
exports.createFileRL = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 3,
    duration: 1,
});
exports.renameFileRL = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 3,
    duration: 1,
});
exports.deleteFileRL = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 3,
    duration: 1,
});
exports.deleteFolderRL = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 1,
    duration: 2,
});
exports.createFolderRL = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 1,
    duration: 2,
});
