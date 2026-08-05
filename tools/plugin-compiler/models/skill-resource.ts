/** Immutable byte-for-byte snapshot of one authored skill resource. */
export interface SkillResourceInput {
  path: string;
  content_base64: string;
}

export class SkillResource {
  readonly path: string;
  readonly content_base64: string;

  /**
   * @param {{ path: string, content_base64: string }} resource Validated resource snapshot.
   */
  constructor({ path, content_base64 }: SkillResourceInput) {
    this.path = path;
    this.content_base64 = content_base64;
    Object.freeze(this);
  }

  /**
   * Return a fresh byte buffer for output composition. A fresh value prevents
   * callers from mutating the immutable base64 snapshot retained by the model.
   */
  get content(): Buffer {
    return Buffer.from(this.content_base64, "base64");
  }
}
