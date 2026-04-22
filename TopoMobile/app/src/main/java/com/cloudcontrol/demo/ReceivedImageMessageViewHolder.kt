package com.cloudcontrol.demo

import android.content.Context
import android.util.Log
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import io.noties.markwon.Markwon
import kotlinx.coroutines.*
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.core.content.ContextCompat

/**
 * 接收到的图片消息ViewHolder（左侧对齐）
 */
class ReceivedImageMessageViewHolder(
    parent: ViewGroup,
    private val fragment: ChatFragment,
    private val markwon: Markwon,
    private val onAvatarClick: (String) -> Unit
) : RecyclerView.ViewHolder(createReceivedImageMessageContainer(parent.context)) {
    
    private val messageContainer: android.widget.LinearLayout = itemView as android.widget.LinearLayout
    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    fun bind(item: ChatItem.ReceivedImageMessage) {
        // 清除现有视图
        messageContainer.removeAllViews()

        val conversationId = fragment.currentConversation?.id
        val isGroupMessage = conversationId?.startsWith("group_") == true || conversationId == ConversationListFragment.CONVERSATION_ID_GROUP
        if (isGroupMessage && item.senderName.isNotBlank() && item.senderName != "我") {
            val senderNameView = android.widget.TextView(fragment.requireContext()).apply {
                text = item.senderName
                textSize = 12f
                setTextColor(0xFF8A8A8A.toInt())
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(
                        (44 * fragment.resources.displayMetrics.density).toInt(),
                        0,
                        0,
                        (4 * fragment.resources.displayMetrics.density).toInt()
                    )
                }
            }
            messageContainer.addView(senderNameView)
        }
        
        val imageFile = ChatImagePathGuard.resolveSafeLocalImageFile(fragment.requireContext(), item.imagePath)
        if (imageFile == null) {
            Log.e("ReceivedImageMessageViewHolder", "图片文件不存在: ${item.imagePath}")
            return
        }
        
        // 头像尺寸
        val avatarSize = (36 * fragment.resources.displayMetrics.density).toInt()
        val avatarMargin = (8 * fragment.resources.displayMetrics.density).toInt()
        val sideMargin = (16 * fragment.resources.displayMetrics.density).toInt()
        val leftRightFixedWidth = avatarSize + avatarMargin + sideMargin
        
        // 接收到的消息：创建内部容器（头像 + 图片），整体左对齐
        val contentContainer = android.widget.LinearLayout(fragment.requireContext()).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            gravity = android.view.Gravity.TOP
        }
        
        // 添加发送者头像（在左侧）
        val avatarImageView = android.widget.ImageView(fragment.requireContext()).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(avatarSize, avatarSize).apply {
                setMargins(0, 0, avatarMargin, 0)
            }
            scaleType = android.widget.ImageView.ScaleType.CENTER_CROP
            visibility = android.view.View.VISIBLE
            minimumWidth = avatarSize
            minimumHeight = avatarSize
            
            outlineProvider = object : android.view.ViewOutlineProvider() {
                override fun getOutline(view: android.view.View, outline: android.graphics.Outline) {
                    outline.setOval(0, 0, view.width, view.height)
                }
            }
            clipToOutline = true
            
            isClickable = true
            isFocusable = true
            setOnClickListener { onAvatarClick(item.senderName) }
            
            // 与左侧文字气泡一致：「我的电脑」会话固定电脑图标（非好友 IMEI，不能走 FriendManager）
            if (fragment.currentConversation?.id == ConversationListFragment.CONVERSATION_ID_ME) {
                setImageResource(R.drawable.ic_computer_avatar)
            } else {
                val senderNameForAvatar = item.senderName.replace(Regex("（[^（）]*）$"), "").trim().ifBlank { item.senderName }
                val customAssistant = CustomAssistantManager.getAll(fragment.requireContext()).find { it.name == senderNameForAvatar }
                when {
                    ChatConstants.isMainAssistantSender(senderNameForAvatar) -> {
                        setImageResource(R.drawable.ic_assistant_avatar)
                    }
                    customAssistant != null -> {
                        AvatarCacheManager.loadCustomAssistantAvatar(
                            context = fragment.requireContext(),
                            imageView = this,
                            assistant = customAssistant,
                            cacheKey = "custom_assistant_${customAssistant.id}",
                            validationTag = customAssistant.id,
                            sizePx = avatarSize
                        )
                    }
                    else -> {
                        // 从好友列表获取头像（使用AvatarCacheManager缓存，避免闪烁）
                        val friendImei = item.senderImei ?: item.senderName  // 优先使用IMEI，如果没有则使用senderName
                        val friend = FriendManager.getFriend(fragment.requireContext(), friendImei)
                        val avatarBase64 = friend?.avatar
                        val cacheKey = "friend_${friendImei}"
                        AvatarCacheManager.loadBase64Avatar(
                            context = fragment.requireContext(),
                            imageView = this,
                            base64String = avatarBase64,
                            defaultResId = R.drawable.ic_person,
                            cacheKey = cacheKey,
                            validationTag = friendImei
                        )
                    }
                }
            }
            background = ContextCompat.getDrawable(fragment.requireContext(), R.drawable.circle_background)
        }
        contentContainer.addView(avatarImageView)
        
        // 图片容器
        val originalSize = (fragment.resources.displayMetrics.widthPixels * 0.6).toInt()
        val imageHeight = originalSize / 2
        val defaultImageWidth = imageHeight
        
        val imageContainer = android.widget.FrameLayout(fragment.requireContext()).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                defaultImageWidth,
                imageHeight
            )
            
            val drawable = android.graphics.drawable.GradientDrawable().apply {
                setColor(0xFFE5E5E5.toInt())  // 接收到的消息使用灰色背景
                cornerRadius = 0f
            }
            background = drawable
        }
        
        // 图片占位符（显示缩略图）
        val placeholderContainer = android.widget.FrameLayout(fragment.requireContext()).apply {
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
            
            isClickable = true
            isFocusable = true
            setOnClickListener {
                val imageUri = ChatImagePathGuard.toSafeViewUri(fragment.requireContext(), imageFile)
                if (imageUri != null) {
                    fragment.showImageFullScreen(imageUri)
                }
            }
        }
        
        // 图片缩略图
        val thumbnailImageView = android.widget.ImageView(fragment.requireContext()).apply {
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
            scaleType = android.widget.ImageView.ScaleType.CENTER_CROP
            clipToOutline = false
        }
        
        // 异步加载图片缩略图
        mainScope.launch {
            try {
                Log.d("ReceivedImageMessageViewHolder", "开始加载图片: ${item.imagePath}")
                val thumbnail = withContext(Dispatchers.IO) {
                    fragment.loadImageThumbnail(item.imagePath, imageHeight)
                }
                if (thumbnail != null && !thumbnail.isRecycled && fragment.isAdded) {
                    Log.d("ReceivedImageMessageViewHolder", "图片加载成功: ${thumbnail.width}x${thumbnail.height}")
                    thumbnailImageView.setImageBitmap(thumbnail)
                } else {
                    Log.e("ReceivedImageMessageViewHolder", "图片加载失败: thumbnail=${thumbnail != null}, isRecycled=${thumbnail?.isRecycled}, isAdded=${fragment.isAdded}")
                    thumbnailImageView.setBackgroundColor(0xFFCCCCCC.toInt())
                    // 显示错误提示
                    thumbnailImageView.contentDescription = "图片加载失败"
                }
            } catch (e: Exception) {
                Log.e("ReceivedImageMessageViewHolder", "加载图片异常: ${e.message}", e)
                thumbnailImageView.setBackgroundColor(0xFFCCCCCC.toInt())
                thumbnailImageView.contentDescription = "图片加载异常: ${e.message}"
            }
        }
        
        placeholderContainer.addView(thumbnailImageView)
        imageContainer.addView(placeholderContainer)
        contentContainer.addView(imageContainer)
        
        // 添加左侧占位符
        val leftSpacer = android.view.View(fragment.requireContext()).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                leftRightFixedWidth,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        messageContainer.addView(leftSpacer)
        messageContainer.addView(contentContainer)
        
        // 有说明文字时在图片下方追加气泡（占位符 [图片] 不再重复展示）
        if (item.query.isNotEmpty() && !ChatConstants.isImageOnlyPlaceholderCaption(item.query)) {
            // 添加间距（在图片和文本消息之间）
            val spacing = android.view.View(fragment.requireContext()).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    (8 * fragment.resources.displayMetrics.density).toInt()  // 8dp间距
                )
            }
            messageContainer.addView(spacing)
            
            val textBubble = fragment.createMessageBubbleForAdapter(
                sender = item.senderName,
                message = item.query,
                isUserMessage = false,  // 左侧对齐
                isComplete = false,
                isAnswer = false,
                markwon = markwon,
                onAvatarClick = onAvatarClick
            )
            messageContainer.addView(textBubble)
        }
    }
    
    companion object {
        private fun createReceivedImageMessageContainer(context: Context): android.widget.LinearLayout {
            return android.widget.LinearLayout(context).apply {
                orientation = android.widget.LinearLayout.VERTICAL
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 8, 0, 8)
                }
                // 接收到的消息左对齐
                gravity = android.view.Gravity.START or android.view.Gravity.TOP
            }
        }
    }
}

