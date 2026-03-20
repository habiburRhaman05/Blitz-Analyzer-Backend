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
