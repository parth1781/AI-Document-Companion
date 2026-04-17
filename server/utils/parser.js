import pdfParse from 'pdf-parse-new';
import mammoth from 'mammoth';

export const extractTextFromFile = async (buffer, mimetype, originalname = '') => {
  const ext = originalname.split('.').pop().toLowerCase();
  
  try {
    if (mimetype === 'application/pdf' || ext === 'pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx'
    ) {
      // Modern .docx
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (mimetype === 'application/msword' || ext === 'doc') {
      // Legacy .doc
      const WordExtractor = (await import('word-extractor')).default;
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      return extracted.getBody();
    } else if (mimetype === 'text/plain' || ext === 'txt') {
      return buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type. Please upload a PDF, DOCX, DOC, or TXT file.');
    }
  } catch (error) {
    console.error('Extraction error:', error);
    throw new Error('Failed to extract text from file.');
  }
};
