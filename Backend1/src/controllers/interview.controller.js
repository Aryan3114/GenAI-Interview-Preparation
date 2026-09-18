const pdfParse = require("pdf-parse")
const {generateInterviewReport,generateResumePdf,generateInterviewPlanPdf} = require("../services/ai.service")
const interviewReportModel = require("../model/interviewReport.model")


async function generateInterviewReportController(req, res) {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "Resume PDF is required"
            })
        }

        const resumeContent = await (
            new pdfParse.PDFParse(
                Uint8Array.from(req.file.buffer)
            )
        ).getText()

        const {
            selfDescription,
            jobDescription
        } = req.body


        const interviewReportByAi = await generateInterviewReport({
            resume: resumeContent.text,
            selfDescription,
            jobDescription
        })


        const interviewReport =
            await interviewReportModel.create({

                user: req.user.id,

                resume: resumeContent.text,

                selfDescription,

                jobDescription,

                ...interviewReportByAi

            })


        res.status(201).json({

            message: "Interview report generated successfully",

            interviewReport

        })

    } catch (error) {

        console.error(
            "Generate Interview Report Error:",
            error
        )

        res.status(500).json({
            message: error.message
        })

    }
}


async function getInterviewReportByIdController(req, res) {

    try {

        const { interviewId } = req.params

        const interviewReport =
            await interviewReportModel.findOne({
                _id: interviewId,
                user: req.user.id
            })


        if (!interviewReport) {

            return res.status(404).json({
                message: "Interview report not found."
            })

        }


        res.status(200).json({

            message: "Interview report fetched successfully.",

            interviewReport

        })

    } catch (error) {

        console.error(error)

        res.status(500).json({
            message: error.message
        })

    }
}


async function getAllInterviewReportsController(req, res) {

    try {

        const interviewReports =
            await interviewReportModel.find({
                user: req.user.id
            })
            .sort({ createdAt: -1 })
            .select(
                "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGap -preparationPlan "
            )


        res.status(200).json({

            message: "Interview reports fetched successfully",

            interviewReports

        })

    } catch (error) {

        console.error(error)

        res.status(500).json({
            message: error.message
        })

    }
}
async function generateResumePdfController(req, res) {

    try {

        const { interviewReportId } = req.params

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const pdfBuffer = await generateResumePdf({
            resume: interviewReport.resume,
            selfDescription: interviewReport.selfDescription,
            jobDescription: interviewReport.jobDescription
        })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="resume_${interviewReportId}.pdf"`,
            "Content-Length": pdfBuffer.length
        })

        res.send(pdfBuffer)

    } catch (error) {

        console.error(
            "Generate Resume PDF Error:",
            error
        )

        res.status(500).json({
            message: error.message
        })
    }
}async function generateInterviewPlanPdfController(req, res) {

    try {

        const { interviewReportId } = req.params;


        const interviewReport =
            await interviewReportModel.findOne({
                _id: interviewReportId,
                user: req.user.id
            });


        if (!interviewReport) {

            return res.status(404).json({
                message: "Interview report not found."
            });

        }


        const pdfBuffer =
            await generateInterviewPlanPdf({
                interviewReport
            });


        res.set({
            "Content-Type": "application/pdf",

            "Content-Disposition":
                `attachment; filename="interview_plan_${interviewReportId}.pdf"`,

            "Content-Length": pdfBuffer.length
        });


        res.send(pdfBuffer);


    } catch (error) {

        console.error(
            "Generate Interview Plan PDF Error:",
            error
        );


        res.status(500).json({
            message: error.message
        });

    }
}

module.exports = {
    generateInterviewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController,
    generateInterviewPlanPdfController

}