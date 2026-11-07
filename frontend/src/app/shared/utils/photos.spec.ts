import { MAX_PHOTO_BYTES, checkPhotoFiles } from './photos';

const file = (name: string, type: string, size = 1000) =>
  new File([new Uint8Array(size)], name, { type });

describe('checkPhotoFiles', () => {
  it('keeps supported images and explains the rest', () => {
    const result = checkPhotoFiles([
      file('a.jpg', 'image/jpeg'),
      file('b.gif', 'image/gif'),
      file('c.png', 'image/png', MAX_PHOTO_BYTES + 1),
    ]);
    expect(result.accepted.map((entry) => entry.name)).toEqual(['a.jpg']);
    expect(result.errors).toEqual([
      'b.gif: choose a JPG, PNG, or WebP image.',
      'c.png: the file must be 8 MB or smaller.',
    ]);
  });

  it('stops at the limit', () => {
    const result = checkPhotoFiles([file('a.jpg', 'image/jpeg'), file('b.jpg', 'image/jpeg')], 1);
    expect(result.accepted.map((entry) => entry.name)).toEqual(['a.jpg']);
    expect(result.errors).toEqual(['Only 1 more photo can be added.']);
  });
});
