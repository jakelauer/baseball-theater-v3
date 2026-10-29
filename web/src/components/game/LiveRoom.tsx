import type { GamePayload } from "../../api/game.js";
import type { LayoutVariant } from "../../layout/variant.js";
import { LiveStatus } from "./LiveStatus.js";

/**
 * The Live room (S3): today its compact status — score, count and inning. The pitch
 * theater body (pitcher and batter cards, zone, pitch sequence, win probability) is
 * S64's.
 */
export function LiveRoom({ game, variant }: { game: GamePayload;
	variant: LayoutVariant; })
{
	return <LiveStatus game={game} variant={variant} />;
}
