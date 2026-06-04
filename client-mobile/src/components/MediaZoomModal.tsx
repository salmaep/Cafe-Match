import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { X } from 'lucide-react-native';
import { spacing } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type ZoomMediaItem = { mediaType: 'photo' | 'video'; url: string };

type Props = {
  list: ZoomMediaItem[] | null;
  initialIndex: number;
  onClose: () => void;
};

function VideoPage({ uri, active }: { uri: string; active: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);

  return (
    <View style={styles.videoWrap}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
}

function PhotoPage({ uri }: { uri: string }) {
  return (
    <ScrollView
      style={{ width: SCREEN_W, height: SCREEN_H }}
      contentContainerStyle={styles.photoContent}
      maximumZoomScale={3}
      minimumZoomScale={1}
      pinchGestureEnabled
      centerContent
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <Image
        source={{ uri }}
        style={styles.photo}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={150}
      />
    </ScrollView>
  );
}

export default function MediaZoomModal({ list, initialIndex, onClose }: Props) {
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex, list]);

  return (
    <Modal
      visible={!!list}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.root}>
        {list && (
          <FlatList
            data={list}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_W,
              offset: SCREEN_W * index,
              index,
            })}
            keyExtractor={(_, i) => 'zoom-' + i}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / SCREEN_W,
              );
              setActiveIndex(idx);
            }}
            renderItem={({ item, index }) =>
              item.mediaType === 'photo' ? (
                <PhotoPage uri={item.url} />
              ) : (
                <VideoPage uri={item.url} active={index === activeIndex} />
              )
            }
          />
        )}
        {list && list.length > 1 && (
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterText}>
              {activeIndex + 1} / {list.length}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={22} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  photoContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: { width: SCREEN_W, height: SCREEN_H },
  videoWrap: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: { width: SCREEN_W, height: SCREEN_H * 0.7 },
  counter: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  counterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
