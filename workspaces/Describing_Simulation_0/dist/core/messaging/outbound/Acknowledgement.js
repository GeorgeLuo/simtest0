export const successAck = (messageId, payload) => ({
    messageId,
    status: "success",
    ...(payload === undefined ? {} : { payload }),
});
export const errorAck = (messageId, error) => ({
    messageId,
    status: "error",
    error,
});
