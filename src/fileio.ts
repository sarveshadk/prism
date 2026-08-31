import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { safeFileName } from './protocol';

export type PickedFile = { name: string; bytes: Uint8Array };

export async function pickFile(): Promise<PickedFile | null> {
  try {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return null;
    const a = res.assets[0];
    return { name: a.name ?? 'file.bin', bytes: await new File(a.uri).bytes() };
  } catch (e) {
    console.warn('pickFile error:', e);
    return null;
  }
}

function writeToCache(name: string, contents: Uint8Array | string) {
  try {
    const f = new File(Paths.cache, safeFileName(name));
    if (f.exists) f.delete();
    f.create();
    f.write(contents);
    return f.uri;
  } catch (e) {
    console.warn('writeToCache error:', e);
    return '';
  }
}

export async function saveAndShare(name: string, bytes: Uint8Array) {
  const uri = writeToCache(name, bytes);
  if (uri && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri);
  }
  return uri;
}

export async function shareJson(name: string, data: unknown) {
  const uri = writeToCache(name, JSON.stringify(data, null, 2));
  if (uri && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, { mimeType: 'application/json' });
  }
  return uri;
}
