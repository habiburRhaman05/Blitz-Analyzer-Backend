import { AnalysisType } from "../../generated/prisma/enums";

export interface IResumeJobMatcherPayload  {
    resumeText: string;
    jobInfo: {
        title: string
        description: string;
        requirements: string;
    }
}

export interface ISaveAnalysisPayload  {
    analysisType:AnalysisType;
    resumeText:string;
    result:any;
    jobData:any;
}

export interface JobInfo {
  title: string
  description: string
  requirements: string
}

export interface ResumeJobMatcherPayload {
  resumeText: string
  jobInfo: JobInfo
}

export interface SaveAnalysisPayload {
  analysisType: "ATS_SCAN" | "JOB_MATCHER"
  resumeText: string
  result: unknown
  jobData?: JobInfo
}

export interface ImprovePayload {
  title: string
  content: string[]
}

export interface SaveResumePayload {
  userId: string
  name: string
  resumeUrl: string
}