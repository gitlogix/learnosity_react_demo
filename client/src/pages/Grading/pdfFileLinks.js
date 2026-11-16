// Learnosity's report PDFs show each uploaded file as a link with an empty
// destination, so clicking it only jumps to the first page. This points those
// links at the server's signed open_url instead, which always downloads the file.

const isEmptyLink = (annotation, PDFName) => {
  if (annotation.get(PDFName.of('Subtype'))?.toString() !== '/Link') return false;
  if (annotation.get(PDFName.of('A'))) return false;

  const dest = annotation.get(PDFName.of('Dest'));
  return !dest || dest.toString() === '/';
};

// The file links appear in answer order, so they are matched to the files in the
// same order. If the counts don't line up the PDF is returned unchanged rather
// than risk linking the wrong file.
export const linkUploadedFiles = async (pdfBytes, files) => {
  const linkable = (files || []).filter(file => file.open_url);
  if (linkable.length === 0) return pdfBytes;

  const { PDFDocument, PDFDict, PDFName, PDFString } = await import('pdf-lib');
  const doc = await PDFDocument.load(pdfBytes);

  const emptyLinks = [];
  doc.getPages().forEach(page => {
    const annotations = page.node.Annots();
    if (!annotations) return;
    for (let i = 0; i < annotations.size(); i += 1) {
      const annotation = annotations.lookupMaybe(i, PDFDict);
      if (annotation && isEmptyLink(annotation, PDFName)) emptyLinks.push(annotation);
    }
  });

  if (emptyLinks.length === 0) return pdfBytes;

  const uploads = linkable.filter(file => file.question_type === 'fileupload');
  const targets = [uploads, linkable].find(list => list.length === emptyLinks.length);
  if (!targets) {
    console.warn(`Not linking uploaded files: the PDF has ${emptyLinks.length} file links but the session has ${linkable.length} files.`);
    return pdfBytes;
  }

  emptyLinks.forEach((annotation, index) => {
    annotation.delete(PDFName.of('Dest'));
    annotation.set(PDFName.of('A'), doc.context.obj({
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(targets[index].open_url),
    }));
  });

  return doc.save();
};
