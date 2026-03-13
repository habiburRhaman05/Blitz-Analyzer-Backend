export type IResumeJobMatcherPayload = {
    resumeText: string;
    jobInfo: {
        title: string
        description: string;
        requirements: string;
    }
}