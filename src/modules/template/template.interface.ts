export interface ITemplateDataPayload {
name: string;
  descriptions: TemplateDescriptions;
  templateString: string;
  requiredFields: string[];
}


interface TemplateDescriptions {
    core_details: string;
  coverTopic: string;
  whyBest: string;
  whichNeedToUseIt: string;
  targetUser: string;
  benefits: string[];
}