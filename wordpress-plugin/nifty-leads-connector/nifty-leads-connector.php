<?php
/**
 * Plugin Name: Nifty Leads Connector
 * Description: Single sign-on and embed bridge between WordPress and the Nifty Leads app (SPEC Section 16).
 * Plugin URI: https://niftytechfinds.com/
 * Version: 0.1.0
 * Author: Madan Chauhan
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: nifty-leads
 */

// Exit if accessed directly.
defined( "ABSPATH" ) || exit;

if ( ! class_exists( "Nifty_Leads_Connector" ) ) {

	/**
	 * Nifty Leads Connector - WordPress bridge.
	 */
	final class Nifty_Leads_Connector {

		private const SETTING_GROUP = "nifty_leads_settings";
		private const APP_URL_KEY = "nl_app_url";
		private const SHARED_SECRET_KEY = "nl_shared_secret";
		private const ROLE_PLAN_MAP_KEY = "nl_role_plan_map";

		public function __construct() {
			add_action( "admin_menu", array( $this, "add_settings_page" ) );
			add_action( "admin_init", array( $this, "register_settings" ) );
			add_shortcode( "nifty_leads", array( $this, "shortcode_app" ) );
			add_shortcode( "nifty_leads_pricing", array( $this, "shortcode_pricing" ) );

			// Plan sync webhooks from WordPress (SPEC Section 16.2.6).
			add_action( "set_user_role", array( $this, "plan_sync_webhook" ), 10, 3 );
		}

		public function add_settings_page() {
			add_options_page(
				__( "Nifty Leads", "nifty-leads" ),
				__( "Nifty Leads", "nifty-leads" ),
				"manage_options",
				"nifty-leads",
				array( $this, "render_settings_page" )
			);
		}

		public function register_settings() {
			register_setting( self::SETTING_GROUP, self::APP_URL_KEY, array( "sanitize_callback" => "sanitize_text_field" ) );
			register_setting( self::SETTING_GROUP, self::SHARED_SECRET_KEY, array( "sanitize_callback" => "sanitize_text_field" ) );
			register_setting( self::SETTING_GROUP, self::ROLE_PLAN_MAP_KEY, array( "sanitize_callback" => array( $this, "sanitize_role_plan_map" ) ) );
		}

		public function sanitize_role_plan_map( $value ) {
			if ( ! is_array( $value ) ) {
				return array();
			}
			$out = array();
			foreach ( $value as $role => $plan ) {
				$out[ sanitize_key( $role ) ] = sanitize_text_field( $plan );
			}
			return $out;
		}

		public function render_settings_page() {
			?>
			<div class="wrap">
				<h1><?php esc_html_e( "Nifty Leads Settings", "nifty-leads" ); ?></h1>
				<form method="post" action="options.php">
					<?php
					settings_fields( self::SETTING_GROUP );
					do_settings_sections( self::SETTING_GROUP );
					?>
					<table class="form-table">
						<tr>
							<th scope="row"><?php esc_html_e( "App URL", "nifty-leads" ); ?></th>
							<td>
								<input type="url" name="<?php echo esc_attr( self::APP_URL_KEY ); ?>" value="<?php echo esc_attr( get_option( self::APP_URL_KEY ) ); ?>" class="regular-text" required />
								<p class="description"><?php esc_html_e( "https://leads.example.com", "nifty-leads" ); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php esc_html_e( "Shared secret", "nifty-leads" ); ?></th>
							<td>
								<input type="text" name="<?php echo esc_attr( self::SHARED_SECRET_KEY ); ?>" value="<?php echo esc_attr( get_option( self::SHARED_SECRET_KEY ) ); ?>" class="regular-text" required />
								<p class="description"><?php esc_html_e( "Must match WP_SSO_SHARED_SECRET in the app .env", "nifty-leads" ); ?></p>
							</td>
						</tr>
					</table>
					<?php submit_button(); ?>
				</form>
			</div>
			<?php
		}

		public function shortcode_app( $atts ) {
			$atts = shortcode_atts( array( "height" => "600" ), $atts, "nifty_leads" );
			$app_url = esc_url_raw( get_option( self::APP_URL_KEY ) );
			$secret  = esc_html( get_option( self::SHARED_SECRET_KEY ) );

			if ( ! $app_url || ! $secret ) {
				return "<p>" . esc_html__( "Nifty Leads is not configured.", "nifty-leads" ) . "</p>";
			}

			$is_logged_in = is_user_logged_in();
			$login_url    = wp_login_url( get_permalink() );

			ob_start();
			?>
			<div id="nifty-leads-wrap" style="width:100%;">
				<?php if ( ! $is_logged_in ) : ?>
					<p><?php echo sprintf( esc_html__( "Please %s to use Nifty Leads.", "nifty-leads" ), '<a href="' . esc_url( $login_url ) . '">log in</a>' ); ?></p>
				<?php else : ?>
					<?php
					require_once plugin_dir_path( __FILE__ ) . "jwt.php";
					$token = nifty_leads_create_sso_token( get_current_user_id(), $secret );
					?>
					<iframe
						id="nifty-leads-frame"
						src="<?php echo esc_url( $app_url ); ?>/sso/wp?token=<?php echo esc_attr( $token ); ?>"
						width="100%"
						height="<?php echo esc_attr( $atts["height"] ); ?>"
						style="border:0;"
						title="Nifty Leads"
					></iframe>
					<script>
						window.addEventListener("message", function (event) {
							if (event.origin !== "<?php echo esc_js( parse_url( $app_url, PHP_URL_HOST ) ? scheme_and_host( $app_url ) : "" ); ?>") return;
							if (event.data && event.data.type === "nl:height") {
								var frame = document.getElementById("nifty-leads-frame");
								if (frame) frame.style.height = event.data.value + "px";
							}
						});
						function scheme_and_host(u){var a=document.createElement('a');a.href=u;return a.protocol+"//"+a.host;}
					</script>
				<?php endif; ?>
			</div>
			<?php
			return ob_get_clean();
		}

		public function shortcode_pricing() {
			$app_url = esc_url_raw( get_option( self::APP_URL_KEY ) );
			if ( ! $app_url ) {
				return "<p>" . esc_html__( "Nifty Leads is not configured.", "nifty-leads" ) . "</p>";
			}
			return '<p><a href="' . esc_attr( rtrim( $app_url, "/" ) . "/pricing" ) . '">' . esc_html__( "View pricing", "nifty-leads" ) . "</a></p>";
		}

		public function plan_sync_webhook( $user_id, $new_role, $old_roles ) {
			$app_url = get_option( self::APP_URL_KEY );
			$secret  = get_option( self::SHARED_SECRET_KEY );
			if ( ! $app_url || ! $secret ) {
				return;
			}

			require_once plugin_dir_path( __FILE__ ) . "jwt.php";
			$user = get_userdata( $user_id );
			if ( ! $user ) {
				return;
			}

			$payload = array(
				"user_id" => $user_id,
				"email"   => $user->user_email,
				"role"    => $new_role,
				"site"    => home_url(),
			);

			$response = wp_remote_post(
				trailingslashit( $app_url ) . "api/wp/plan-sync",
				array(
					"method"      => "POST",
					"headers"     => array( "Content-Type" => "application/json" ),
					"body"        => wp_json_encode( $payload ),
					"timeout"     => 10,
					"blocking"    => false,
				)
			);
		}
	}

	new Nifty_Leads_Connector();

}

/**
 * SSO token helper (SPEC Section 16.2.4).
 * Uses firebase/php-jwt (HS256) if available; otherwise a minimal fallback.
 */
function nifty_leads_create_sso_token( $user_id, $shared_secret ) {
	require_once plugin_dir_path( __FILE__ ) . "jwt.php";

	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return "";
	}

	$now   = time();
	$exp   = $now + 60; // 60 seconds (SPEC Section 16.2.4)
	$jti   = wp_create_nonce( "nl_sso" );

	$claims = array(
		"sub"    => (string) $user_id,
		"email"  => $user->user_email,
		"name"   => $user->display_name,
		"plan"   => get_user_meta( $user_id, "nl_plan", true ),
		"site"   => home_url(),
		"iat"    => $now,
		"exp"    => $exp,
		"jti"    => $jti,
	);

	if ( class_exists( "\Firebase\JWT\JWT" ) ) {
		return \Firebase\JWT\JWT::encode( $claims, $shared_secret, "HS256" );
	}

	// Fallback: minimal HS256 JWT (not for production without firebase/php-jwt).
	return nifty_leads_minimal_jwt( $claims, $shared_secret );
}

function nifty_leads_minimal_jwt( array $claims, string $secret ): string {
	$header = array( "alg" => "HS256", "typ" => "JWT" );
	$segments = array();
	$segments[] = nifty_leads_base64url_encode( json_encode( $header ) );
	$segments[] = nifty_leads_base64url_encode( json_encode( $claims ) );
	$signing_input = implode( ".", $segments );
	$signature = hash_hmac( "sha256", $signing_input, $secret, true );
	$segments[] = nifty_leads_base64url_encode( $signature );
	return implode( ".", $segments );
}

function nifty_leads_base64url_encode( $data ) {
	return rtrim( strtr( base64_encode( $data ), "+/", "-_" ), "=" );
}
