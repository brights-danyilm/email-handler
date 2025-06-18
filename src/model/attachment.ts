export class Attachment {
    constructor(
        public readonly mimeType: string,
        public readonly contentDisposition: 'attachment' | 'inline',
        public readonly filename?: string,
        public readonly content?: Buffer,
        public readonly cid?: string,
    ) {}
}
