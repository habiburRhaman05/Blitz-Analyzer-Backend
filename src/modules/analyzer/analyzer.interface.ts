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




export interface SaveAnalysisPayload {
  analysisType: "ATS_SCAN" | "JOB_MATCHER"
  id: string
  resumeText: string
  result: any

}

// Payload stored on an analysisQueue job, shared by all five job names
// so one worker can dispatch on job.name using a single data shape.
export interface AnalysisJobData {
  userId: string;
  jobId: string;
  creditCost: number;
  parseText?: string;
  jobData?: string;
  resumeText?: string;
  prompt?: string;
  title?: string;
  content?: string[];
}
