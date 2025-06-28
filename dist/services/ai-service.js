"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCode = void 0;
const genai_1 = require("@google/genai");
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const generateCode = (fileName, fileContent, instructions, line, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    const stream = yield ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `The file name is ${fileName}`
                    },
                    {
                        text: `Here is the file content:\n${fileContent}.`
                    },
                    {
                        text: `Additional instructions:\n${instructions}.`
                    },
                    {
                        text: `The code to insert should be syntactically correct and should not cause any errors when inserted at line ${line}.`
                    }
                ]
            },
        ],
        config: {
            systemInstruction: "You are an expert coding assistant who reads from an existing code file and suggests code to add. You are given the code file content. You may be given additional instructions to follow strictly while generating code. Generate correct, readable, efficient code that follows best practices. Only return the code — no explanation. When you generate code, ensure it is syntactically correct and can be inserted at the specified line without causing errors. If you are unsure about the code, ask for clarification. Don't include extra backticks or formatting in your response.",
        },
    });
    try {
        for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
            _c = stream_1_1.value;
            _d = false;
            const chunk = _c;
            onChunk(chunk.text || "");
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_d && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // for await (const chunk of response) {
    //     return chunk.text;
    // }
    // return response.text;
});
exports.generateCode = generateCode;
