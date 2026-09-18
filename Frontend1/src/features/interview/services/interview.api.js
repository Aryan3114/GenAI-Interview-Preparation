import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});


/**
 * @description
 * Generate interview report based on user self description,
 * resume and job description.
 */
export const generateInterviewReport = async ({
    jobDescription,
    selfDescription,
    resumeFile
}) => {

    const formData = new FormData();

    formData.append("jobDescription", jobDescription);
    formData.append("selfDescription", selfDescription);
    formData.append("resume", resumeFile);

    const response = await api.post(
        "/api/interview/",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;
};


/**
 * @description
 * Get interview report by interview ID.
 */
export const getInterviewReportById = async (interviewId) => {

    const response = await api.get(
        `/api/interview/report/${interviewId}`
    );

    return response.data;
};


/**
 * @description
 * Get all interview reports of logged-in user.
 */
export const getAllInterviewReports = async () => {

    const response = await api.get(
        "/api/interview/"
    );

    return response.data;
};


/**
 * @description
 * Generate/download interview plan PDF.
 */
export const generateInterviewPlanPdf = async ({
    interviewReportId
}) => {

    const response = await api.post(
        `/api/interview/report/pdf/${interviewReportId}`,
        null,
        {
            responseType: "blob"
        }
    );

    return response.data;
};