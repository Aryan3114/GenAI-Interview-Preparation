import {
    getAllInterviewReports,
    generateInterviewReport,
    getInterviewReportById,
    generateInterviewPlanPdf
} from "../services/interview.api"

import { useContext, useEffect } from "react"
import { InterviewContext } from "../Interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)

    const { interviewId } = useParams()


    if (!context) {
        throw new Error(
            "useInterview must be used within an InterviewProvider"
        )
    }


    const {
        loading,
        setLoading,
        report,
        setReport,
        reports,
        setReports
    } = context


    // =====================================================
    // GENERATE INTERVIEW REPORT
    // =====================================================

    const generateReport = async ({
        jobDescription,
        selfDescription,
        resumeFile
    }) => {

        setLoading(true)

        try {

            const response =
                await generateInterviewReport({
                    jobDescription,
                    selfDescription,
                    resumeFile
                })


            console.log(
                "GENERATE REPORT RESPONSE:",
                response
            )


            setReport(
                response?.interviewReport
            )


            return response?.interviewReport


        } catch (error) {

            console.error(
                "Error generating report:",
                error.response?.data ||
                error.message
            )


            throw error


        } finally {

            setLoading(false)

        }
    }


    // =====================================================
    // GET REPORT BY ID
    // =====================================================

    const getReportById = async (
        interviewReportId
    ) => {

        setLoading(true)

        try {

            const response =
                await getInterviewReportById(
                    interviewReportId
                )


            console.log(
                "INTERVIEW REPORT RESPONSE:",
                response
            )


            setReport(
                response?.interviewReport
            )


            return response?.interviewReport


        } catch (error) {

            console.error(
                "Error getting report:",
                error.response?.data ||
                error.message
            )


            throw error


        } finally {

            setLoading(false)

        }
    }


    // =====================================================
    // GET ALL REPORTS
    // =====================================================

    const getReports = async () => {

        setLoading(true)

        try {

            const response =
                await getAllInterviewReports()


            console.log(
                "ALL INTERVIEW REPORTS RESPONSE:",
                response
            )


            const interviewReports =
                Array.isArray(
                    response?.interviewReports
                )
                    ? response.interviewReports
                    : []


            setReports(
                interviewReports
            )


            return interviewReports


        } catch (error) {

            console.error(
                "Error getting reports:",
                error.response?.data ||
                error.message
            )


            throw error


        } finally {

            setLoading(false)

        }
    }


    // =====================================================
    // DOWNLOAD INTERVIEW PLAN PDF
    // =====================================================

    const getInterviewPlanPdf = async (
        interviewReportId
    ) => {

        setLoading(true)

        try {

            console.log(
                "Downloading interview plan:",
                interviewReportId
            )


            const response =
                await generateInterviewPlanPdf({
                    interviewReportId
                })


            // ---------------------------------------------
            // Convert response to PDF Blob
            // ---------------------------------------------

            const blob =
                new Blob(
                    [response],
                    {
                        type: "application/pdf"
                    }
                )


            // ---------------------------------------------
            // Create temporary download URL
            // ---------------------------------------------

            const url =
                window.URL.createObjectURL(
                    blob
                )


            // ---------------------------------------------
            // Create download link
            // ---------------------------------------------

            const link =
                document.createElement("a")


            link.href = url

            link.download =
                `interview_plan_${interviewReportId}.pdf`


            document.body.appendChild(link)


            link.click()


            // ---------------------------------------------
            // Cleanup
            // ---------------------------------------------

            link.remove()

            window.URL.revokeObjectURL(url)


        } catch (error) {

            console.error(
                "Error downloading interview plan:",
                error.response?.data ||
                error.message
            )


            throw error


        } finally {

            setLoading(false)

        }
    }


    // =====================================================
    // LOAD REPORTS
    // =====================================================

    useEffect(() => {

        if (interviewId) {

            getReportById(interviewId)
                .catch(() => {})

        } else {

            getReports()
                .catch(() => {})

        }

    }, [interviewId])


    // =====================================================
    // RETURN
    // =====================================================

    return {

        loading,

        report,

        reports,

        generateReport,

        getReportById,

        getReports,

        getInterviewPlanPdf

    }

}