// utils/response.js - 统一返回格式（类似 Spring 的 ResponseEntity）
const success = (res, data, message = '成功', code = 200) => {
    // 1. res 是 Express 的响应对象
    // 2. res.status(code) 设置 HTTP 状态码
    // 3. .json() 把对象转成 JSON 字符串，并发送给前端
    res.status(code).json({
        success: true,
        message,
        data
    });
};

const error = (res, message = '失败', code = 500) => {
    res.status(code).json({
        success: false,
        message,
        error: message
    });
};

module.exports = {
    success,
    error
};