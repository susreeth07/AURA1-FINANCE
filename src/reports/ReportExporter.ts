import { ReportDocument } from './ReportModels';

export interface ReportExporter {
  export(document: ReportDocument): Blob;
}
