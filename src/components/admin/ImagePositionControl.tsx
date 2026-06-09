import { Move, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { getImagePositionCoordinates, getPhotoMediaStyle, normalizeImagePosition, normalizeImageScale } from '../../utils/media';

interface ImagePositionControlProps {
  image: string;
  value?: string;
  scale?: number;
  label?: string;
  sizeLabel?: string;
  className?: string;
  compact?: boolean;
  onChange: (value: string) => void;
  onScaleChange?: (value: number) => void;
  onCommit?: (value: string) => void;
  onScaleCommit?: (value: number) => void;
}

const presets = [
  { x: 0, y: 0, label: 'Левый верхний угол' },
  { x: 50, y: 0, label: 'Верх по центру' },
  { x: 100, y: 0, label: 'Правый верхний угол' },
  { x: 0, y: 50, label: 'Слева по центру' },
  { x: 50, y: 50, label: 'Центр' },
  { x: 100, y: 50, label: 'Справа по центру' },
  { x: 0, y: 100, label: 'Левый нижний угол' },
  { x: 50, y: 100, label: 'Низ по центру' },
  { x: 100, y: 100, label: 'Правый нижний угол' },
];

const formatPosition = (x: number, y: number) => `${Math.round(x)}% ${Math.round(y)}%`;

export function ImagePositionControl({
  image,
  value,
  scale = 100,
  label = 'Отображение фото',
  sizeLabel = 'Размер',
  className = '',
  compact = false,
  onChange,
  onScaleChange,
  onCommit,
  onScaleCommit,
}: ImagePositionControlProps) {
  const position = normalizeImagePosition(value);
  const { x, y } = getImagePositionCoordinates(position);
  const pendingPosition = useRef(position);
  const pendingScale = useRef(normalizeImageScale(scale));
  const previewRef = useRef<HTMLDivElement>(null);
  const normalizedScale = normalizeImageScale(scale);

  useEffect(() => {
    pendingPosition.current = position;
  }, [position]);

  useEffect(() => {
    pendingScale.current = normalizedScale;
  }, [normalizedScale]);

  const setPosition = (nextX: number, nextY: number, commitNow = false) => {
    const nextPosition = formatPosition(nextX, nextY);
    pendingPosition.current = nextPosition;
    onChange(nextPosition);
    if (commitNow) onCommit?.(nextPosition);
  };

  const setScale = (nextScale: number, commitNow = false) => {
    const boundedScale = normalizeImageScale(nextScale);
    pendingScale.current = boundedScale;
    onScaleChange?.(boundedScale);
    if (commitNow) onScaleCommit?.(boundedScale);
  };

  const commitPosition = () => {
    onCommit?.(pendingPosition.current);
  };

  const commitScale = () => {
    onScaleCommit?.(pendingScale.current);
  };

  const updateFromPointer = (clientX: number, clientY: number, commitNow = false) => {
    const preview = previewRef.current;
    if (!preview) return;

    const rect = preview.getBoundingClientRect();
    const nextX = ((clientX - rect.left) / rect.width) * 100;
    const nextY = ((clientY - rect.top) / rect.height) * 100;
    setPosition(Math.min(100, Math.max(0, nextX)), Math.min(100, Math.max(0, nextY)), commitNow);
  };

  const handleScalePointerUp = (event: PointerEvent<HTMLInputElement>) => {
    setScale(Number(event.currentTarget.value), true);
  };

  const handlePreviewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;

    event.preventDefault();
    if (event.key === 'Home') {
      setPosition(50, 50, true);
      return;
    }

    const nextX = event.key === 'ArrowLeft' ? x - step : event.key === 'ArrowRight' ? x + step : x;
    const nextY = event.key === 'ArrowUp' ? y - step : event.key === 'ArrowDown' ? y + step : y;
    setPosition(Math.min(100, Math.max(0, nextX)), Math.min(100, Math.max(0, nextY)), true);
  };

  return (
    <div className={['image-position-control', compact ? 'image-position-control--compact' : '', className].filter(Boolean).join(' ')}>
      <div className="image-position-control__header">
        <span><Move size={16} /> {label}</span>
        <button type="button" className="image-position-reset" onClick={() => setPosition(50, 50, true)} title="Вернуть фото в центр" aria-label="Вернуть фото в центр">
          <RotateCcw size={15} />
        </button>
      </div>

      <div className="image-position-control__body">
        <div
          ref={previewRef}
          className="image-position-preview"
          style={getPhotoMediaStyle(image, position, normalizedScale)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromPointer(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) return;
            updateFromPointer(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => updateFromPointer(event.clientX, event.clientY, true)}
          onKeyDown={handlePreviewKeyDown}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.max(x, y))}
          aria-valuetext={`${Math.round(x)}% ${Math.round(y)}%`}
        >
          <span className="image-position-crop-frame" style={{ left: `${x}%`, top: `${y}%` }}>
            <span />
            <span />
            <span />
            <span />
          </span>
        </div>

        <div className="image-position-tools">
          <label>
            <span>{sizeLabel}: {normalizedScale}%</span>
            <input
              type="range"
              min="50"
              max="200"
              value={normalizedScale}
              onBlur={commitScale}
              onChange={(event) => setScale(Number(event.target.value))}
              onPointerUp={handleScalePointerUp}
            />
          </label>
          <label>
            <span>Горизонталь: {Math.round(x)}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(x)}
              onBlur={commitPosition}
              onChange={(event) => setPosition(Number(event.target.value), y)}
              onPointerUp={commitPosition}
            />
          </label>
          <label>
            <span>Вертикаль: {Math.round(y)}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(y)}
              onBlur={commitPosition}
              onChange={(event) => setPosition(x, Number(event.target.value))}
              onPointerUp={commitPosition}
            />
          </label>

          <div className="image-position-presets" aria-label="Быстрый выбор позиции фото">
            {presets.map((preset) => (
              <button
                key={`${preset.x}-${preset.y}`}
                type="button"
                className={Math.round(x) === preset.x && Math.round(y) === preset.y ? 'active' : ''}
                onClick={() => setPosition(preset.x, preset.y, true)}
                title={preset.label}
                aria-label={preset.label}
              >
                <span />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
