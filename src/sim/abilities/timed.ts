import { GameplayAbility } from '../gas/ability'
import { Tag } from '../gas/tags'

/** Does nothing but hold a state tag for a fixed time (warning gesture, resting). */
export class TimedAbility extends GameplayAbility {
  override readonly cancelOnTags = Tag.Stunned | Tag.Dead

  constructor(
    frames: number,
    override readonly grantedTags: number,
  ) {
    super()
    this.duration = frames
  }
}
