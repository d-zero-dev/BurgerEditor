/**
 *
 * @param src
 */
export function getExt(src: string) {
	const ext = src.split('.').pop()?.toLowerCase() ?? '';

	const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
	const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(ext);
	const isAudio = ['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext);
	const isDoc = ['doc', 'docx'].includes(ext);
	const isPpt = ['ppt', 'pptx'].includes(ext);
	const isXls = ['xls', 'xlsx'].includes(ext);
	const isPdf = ['pdf'].includes(ext);

	return {
		ext,
		isImage,
		isVideo,
		isAudio,
		isDoc,
		isPpt,
		isXls,
		isPdf,
	};
}
