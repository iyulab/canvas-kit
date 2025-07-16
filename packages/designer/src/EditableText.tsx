import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Text as KonvaText, Transformer as KonvaTransformer } from 'react-konva';
import Konva from 'konva';

interface EditableTextProps {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    width?: number;
    draggable?: boolean;
    isSelected?: boolean;
    onTextChange?: (newText: string) => void;
    onSelect?: () => void;
    onTransform?: (attrs: any) => void;
}

export const EditableText: React.FC<EditableTextProps> = ({
    x,
    y,
    text,
    fontSize = 20,
    fontFamily = 'Arial',
    fill = '#000000',
    width = 200,
    draggable = true,
    isSelected = false,
    onTextChange,
    onSelect,
    onTransform
}) => {
    const textRef = useRef<Konva.Text>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Transformer 설정
    useEffect(() => {
        if (isSelected && transformerRef.current && textRef.current) {
            transformerRef.current.nodes([textRef.current]);
            transformerRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    // 더블클릭으로 텍스트 편집 시작
    const handleDblClick = useCallback(() => {
        if (!textRef.current) return;

        setIsEditing(true);
        const textNode = textRef.current;

        // 텍스트 노드 숨기기
        textNode.hide();
        if (transformerRef.current) {
            transformerRef.current.hide();
        }

        // 텍스트 노드의 절대 위치 계산
        const textPosition = textNode.absolutePosition();
        const stage = textNode.getStage();
        if (!stage) return;

        const stageBox = stage.container().getBoundingClientRect();

        const areaPosition = {
            x: stageBox.left + textPosition.x,
            y: stageBox.top + textPosition.y,
        };

        // 텍스트 편집을 위한 textarea 생성
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        textarea.value = text;
        textarea.style.position = 'absolute';
        textarea.style.top = areaPosition.y + 'px';
        textarea.style.left = areaPosition.x + 'px';
        textarea.style.width = textNode.width() - textNode.padding() * 2 + 'px';
        textarea.style.height = textNode.height() - textNode.padding() * 2 + 5 + 'px';
        textarea.style.fontSize = fontSize + 'px';
        textarea.style.border = '1px solid #007bff';
        textarea.style.padding = '0px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'white';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.lineHeight = '1.2';
        textarea.style.fontFamily = fontFamily;
        textarea.style.color = fill;
        textarea.style.borderRadius = '2px';
        textarea.style.zIndex = '1000';

        const rotation = textNode.rotation();
        let transform = '';
        if (rotation) {
            transform += 'rotateZ(' + rotation + 'deg)';
        }

        textarea.style.transform = transform;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 3 + 'px';

        textarea.focus();
        textarea.select();

        // textarea 제거 함수
        function removeTextarea() {
            if (textarea.parentNode) {
                textarea.parentNode.removeChild(textarea);
            }
            window.removeEventListener('click', handleOutsideClick);
            textNode.show();
            if (transformerRef.current) {
                transformerRef.current.show();
                transformerRef.current.forceUpdate();
            }
            setIsEditing(false);
        }

        // Enter 키로 편집 완료
        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (onTextChange) {
                    onTextChange(textarea.value);
                }
                removeTextarea();
            }
            if (e.key === 'Escape') {
                removeTextarea();
            }
        });

        // 텍스트 크기에 따라 textarea 크기 조정
        textarea.addEventListener('input', function () {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });

        // 외부 클릭 시 편집 완료
        function handleOutsideClick(e: Event) {
            if (e.target !== textarea) {
                if (onTextChange) {
                    onTextChange(textarea.value);
                }
                removeTextarea();
            }
        }

        setTimeout(() => {
            window.addEventListener('click', handleOutsideClick);
        }, 100);
    }, [text, fontSize, fontFamily, fill, onTextChange]);

    // 클릭으로 선택
    const handleClick = useCallback(() => {
        if (!isEditing && onSelect) {
            onSelect();
        }
    }, [isEditing, onSelect]);

    // Transform 이벤트 처리
    const handleTransform = useCallback(() => {
        const node = textRef.current;
        if (!node || !onTransform) return;

        const attrs = {
            x: node.x(),
            y: node.y(),
            width: node.width() * node.scaleX(),
            scaleX: 1,
            scaleY: 1,
            rotation: node.rotation(),
        };

        // 스케일 리셋
        node.setAttrs(attrs);
        onTransform(attrs);
    }, [onTransform]);

    return (
        <>
            <KonvaText
                ref={textRef}
                x={x}
                y={y}
                text={text}
                fontSize={fontSize}
                fontFamily={fontFamily}
                fill={fill}
                width={width}
                draggable={draggable}
                onClick={handleClick}
                onDblClick={handleDblClick}
                onTap={handleClick}
                onDbltap={handleDblClick}
                onTransform={handleTransform}
                stroke={isSelected ? '#007bff' : undefined}
                strokeWidth={isSelected ? 1 : 0}
                shadowColor={isSelected ? '#007bff' : undefined}
                shadowBlur={isSelected ? 5 : 0}
                shadowOpacity={isSelected ? 0.6 : 0}
                perfectDrawEnabled={false}
            />
            {isSelected && (
                <KonvaTransformer
                    ref={transformerRef}
                    enabledAnchors={['middle-left', 'middle-right']}
                    boundBoxFunc={(oldBox, newBox) => {
                        newBox.width = Math.max(30, newBox.width);
                        return newBox;
                    }}
                />
            )}
        </>
    );
};

export default EditableText;
