import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json"
    }
});

export const getDashboard = async () => {
    const response = await api.get("/dashboard");
    return response.data;
};

export const getAnalytics = async () => {
    const response = await api.get("/dashboard/analytics");
    return response.data;
};

export const getComponents = async () => {
    const response = await api.get("/components");
    return response.data;
};

export const getComponent = async (componentId) => {
    const response = await api.get(`/components/${componentId}`);
    return response.data;
};

export default api;
