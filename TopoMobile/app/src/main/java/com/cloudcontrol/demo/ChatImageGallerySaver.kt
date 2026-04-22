package com.cloudcontrol.demo

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 将聊天中查看的图片保存到系统相册（Pictures/TopoClaw聊天）。
 */
object ChatImageGallerySaver {

    private const val TAG = "ChatImageGallerySaver"
    private const val ALBUM_RELATIVE = "TopoClaw聊天"

    /**
     * 从任意可读 [Uri]（含 FileProvider）复制到相册，避免整图解码导致 OOM。
     */
    suspend fun saveImageFromUri(context: Context, uri: Uri): Boolean = withContext(Dispatchers.IO) {
        try {
            val resolver = context.contentResolver
            val mime = resolver.getType(uri)?.takeIf { it.startsWith("image/") }
                ?: guessMimeFromUri(uri)
            val ext = extensionForMime(mime)
            val fileName = "chat_${System.currentTimeMillis()}.$ext"
            resolver.openInputStream(uri)?.use { input ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    saveStreamToMediaStoreQ(context, input, fileName, mime)
                } else {
                    saveStreamToLegacyPublicPictures(context, input, fileName, mime)
                }
            } ?: return@withContext false
            true
        } catch (e: Exception) {
            Log.e(TAG, "saveImageFromUri: ${e.message}", e)
            false
        }
    }

    private fun guessMimeFromUri(uri: Uri): String {
        val path = uri.path?.lowercase() ?: return "image/jpeg"
        return when {
            path.endsWith(".png") -> "image/png"
            path.endsWith(".webp") -> "image/webp"
            path.endsWith(".gif") -> "image/gif"
            else -> "image/jpeg"
        }
    }

    private fun extensionForMime(mime: String): String = when {
        mime.contains("png") -> "png"
        mime.contains("webp") -> "webp"
        mime.contains("gif") -> "gif"
        else -> "jpg"
    }

    private fun saveStreamToMediaStoreQ(context: Context, input: InputStream, fileName: String, mime: String): Boolean {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
            put(MediaStore.Images.Media.MIME_TYPE, mime)
            put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + ALBUM_RELATIVE)
        }
        val outUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            ?: return false
        resolver.openOutputStream(outUri)?.use { output ->
            input.copyTo(output)
        } ?: return false
        return true
    }

    private fun saveStreamToLegacyPublicPictures(
        context: Context,
        input: InputStream,
        fileName: String,
        mime: String
    ): Boolean {
        val picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
        val dir = File(picturesDir, ALBUM_RELATIVE)
        if (!dir.exists() && !dir.mkdirs()) {
            Log.e(TAG, "无法创建目录: ${dir.absolutePath}")
            return false
        }
        val file = File(dir, fileName)
        FileOutputStream(file).use { out -> input.copyTo(out) }
        MediaScannerConnection.scanFile(
            context,
            arrayOf(file.absolutePath),
            arrayOf(mime),
            null
        )
        return true
    }
}
