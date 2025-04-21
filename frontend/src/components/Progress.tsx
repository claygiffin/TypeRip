import { type ComponentProps } from 'react'

type Props = ComponentProps<'div'> & {
  progress:
    | { current?: number; total?: number; status: string }
    | undefined
}

export const Progress = ({ progress, ...props }: Props) => {
  console.log(progress)
  const inProgress =
    progress?.status && progress.status !== 'Download complete'
  return (
    <div
      className={'progress-container'}
      data-in-progress={inProgress}
      {...props}
    >
      <h2>
        {progress?.status}
        {progress?.current && progress.total && (
          <span>
            ({progress.current}/{progress.total})
          </span>
        )}
      </h2>
    </div>
  )
}
