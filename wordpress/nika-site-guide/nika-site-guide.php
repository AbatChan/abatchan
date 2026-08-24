<?php
/**
 * Plugin Name:       Nika Site Guide
 * Plugin URI:        https://abatchan.com/nika
 * Description:       Connects a WordPress site to its Nika context-aware guide.
 * Version:           0.1.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            abatchan
 * Author URI:        https://abatchan.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       nika-site-guide
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const NIKA_SITE_GUIDE_VERSION = '0.1.0';
const NIKA_SITE_GUIDE_OPTION  = 'nika_site_guide';
const NIKA_SITE_GUIDE_HANDLE  = 'nika-site-guide';
const NIKA_SITE_GUIDE_SERVICE = 'https://abatchan.com';

function nika_site_guide_settings() {
	$saved = get_option( NIKA_SITE_GUIDE_OPTION, array() );
	return array(
		'site_key' => isset( $saved['site_key'] ) ? (string) $saved['site_key'] : '',
		'enabled'  => ! empty( $saved['enabled'] ),
	);
}

function nika_site_guide_sanitize_settings( $input ) {
	$input    = is_array( $input ) ? $input : array();
	$site_key = isset( $input['site_key'] ) ? sanitize_text_field( wp_unslash( $input['site_key'] ) ) : '';
	if ( $site_key && ! preg_match( '/^[A-Za-z0-9_-]+$/', $site_key ) ) {
		add_settings_error( NIKA_SITE_GUIDE_OPTION, 'nika_invalid_key', __( 'The site key may contain only letters, numbers, underscores, and hyphens.', 'nika-site-guide' ) );
		$site_key = '';
	}
	return array( 'site_key' => $site_key, 'enabled' => ! empty( $input['enabled'] ) );
}

add_action( 'admin_init', function () {
	register_setting( 'nika_site_guide_group', NIKA_SITE_GUIDE_OPTION, array(
		'type'              => 'array',
		'sanitize_callback' => 'nika_site_guide_sanitize_settings',
		'default'           => array( 'site_key' => '', 'enabled' => false ),
	) );
} );

add_action( 'admin_menu', function () {
	add_options_page( __( 'Nika Site Guide', 'nika-site-guide' ), __( 'Nika Site Guide', 'nika-site-guide' ), 'manage_options', 'nika-site-guide', 'nika_site_guide_settings_page' );
} );

function nika_site_guide_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) return;
	$settings = nika_site_guide_settings();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Nika Site Guide', 'nika-site-guide' ); ?></h1>
		<p><?php esc_html_e( 'Connect this site to the context-aware guide configured in your Nika account.', 'nika-site-guide' ); ?></p>
		<?php settings_errors( NIKA_SITE_GUIDE_OPTION ); ?>
		<form action="options.php" method="post">
			<?php settings_fields( 'nika_site_guide_group' ); ?>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="nika-site-key"><?php esc_html_e( 'Site key', 'nika-site-guide' ); ?></label></th><td>
					<input class="regular-text code" id="nika-site-key" name="<?php echo esc_attr( NIKA_SITE_GUIDE_OPTION ); ?>[site_key]" type="text" value="<?php echo esc_attr( $settings['site_key'] ); ?>" autocomplete="off" placeholder="site_your_site">
					<p class="description"><?php esc_html_e( 'Copy this from your Nika account. The key is public; approved domains protect its use.', 'nika-site-guide' ); ?></p>
				</td></tr>
				<tr><th scope="row"><?php esc_html_e( 'Guide status', 'nika-site-guide' ); ?></th><td>
					<label><input name="<?php echo esc_attr( NIKA_SITE_GUIDE_OPTION ); ?>[enabled]" type="checkbox" value="1" <?php checked( $settings['enabled'] ); ?>> <?php esc_html_e( 'Show Nika to visitors', 'nika-site-guide' ); ?></label>
				</td></tr>
			</table>
			<?php submit_button( __( 'Save Nika settings', 'nika-site-guide' ) ); ?>
		</form>
		<hr>
		<h2><?php esc_html_e( 'Connection test', 'nika-site-guide' ); ?></h2>
		<p><?php esc_html_e( 'Confirm that the saved key belongs to this WordPress domain.', 'nika-site-guide' ); ?></p>
		<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
			<input type="hidden" name="action" value="nika_site_guide_test"><?php wp_nonce_field( 'nika_site_guide_test' ); ?>
			<?php submit_button( __( 'Test connection', 'nika-site-guide' ), 'secondary', 'submit', false, $settings['site_key'] ? array() : array( 'disabled' => 'disabled' ) ); ?>
		</form>
		<hr>
		<h2><?php esc_html_e( 'External service and privacy', 'nika-site-guide' ); ?></h2>
		<p><?php esc_html_e( 'This plugin loads Nika from abatchan.com. Visitor questions, the current page URL, and limited visible page context are sent there to generate replies and page guidance. Nika does not use WordPress login cookies.', 'nika-site-guide' ); ?></p>
		<p><a href="https://abatchan.com/privacy" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Read the Nika privacy policy', 'nika-site-guide' ); ?></a></p>
	</div>
	<?php
}

add_action( 'admin_post_nika_site_guide_test', function () {
	if ( ! current_user_can( 'manage_options' ) ) wp_die( esc_html__( 'You are not allowed to test this connection.', 'nika-site-guide' ) );
	check_admin_referer( 'nika_site_guide_test' );
	$settings = nika_site_guide_settings();
	$status   = 'missing';
	if ( $settings['site_key'] ) {
		$response = wp_remote_get( NIKA_SITE_GUIDE_SERVICE . '/api/guide-config?site=' . rawurlencode( $settings['site_key'] ), array(
			'timeout' => 12,
			'headers' => array( 'Accept' => 'application/json', 'Origin' => untrailingslashit( home_url() ) ),
		) );
		if ( is_wp_error( $response ) ) $status = 'network';
		else {
			$code   = (int) wp_remote_retrieve_response_code( $response );
			$status = 200 === $code ? 'ok' : ( 403 === $code ? 'domain' : 'key' );
		}
	}
	wp_safe_redirect( add_query_arg( array( 'page' => 'nika-site-guide', 'nika_status' => $status ), admin_url( 'options-general.php' ) ) );
	exit;
} );

add_action( 'admin_notices', function () {
	if ( empty( $_GET['page'] ) || 'nika-site-guide' !== $_GET['page'] || empty( $_GET['nika_status'] ) ) return; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$status = sanitize_key( wp_unslash( $_GET['nika_status'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$copy   = array(
		'ok' => array( 'success', __( 'Connected. This domain is approved for the saved Nika site key.', 'nika-site-guide' ) ),
		'domain' => array( 'error', __( 'The key exists, but this domain is not approved in Nika yet.', 'nika-site-guide' ) ),
		'key' => array( 'error', __( 'Nika did not recognize this site key.', 'nika-site-guide' ) ),
		'network' => array( 'error', __( 'WordPress could not reach Nika. Check outbound HTTPS or try again.', 'nika-site-guide' ) ),
		'missing' => array( 'warning', __( 'Save a Nika site key before testing the connection.', 'nika-site-guide' ) ),
	);
	if ( isset( $copy[ $status ] ) ) printf( '<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>', esc_attr( $copy[ $status ][0] ), esc_html( $copy[ $status ][1] ) );
} );

add_action( 'wp_enqueue_scripts', function () {
	$settings = nika_site_guide_settings();
	if ( ! $settings['enabled'] || ! $settings['site_key'] ) return;
	wp_enqueue_script( NIKA_SITE_GUIDE_HANDLE, NIKA_SITE_GUIDE_SERVICE . '/embed.js', array(), NIKA_SITE_GUIDE_VERSION, true );
} );

add_filter( 'script_loader_tag', function ( $tag, $handle ) {
	if ( NIKA_SITE_GUIDE_HANDLE !== $handle ) return $tag;
	$settings = nika_site_guide_settings();
	return str_replace( '<script ', '<script data-site="' . esc_attr( $settings['site_key'] ) . '" async ', $tag );
}, 10, 2 );

add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=nika-site-guide' ) ) . '">' . esc_html__( 'Settings', 'nika-site-guide' ) . '</a>' );
	return $links;
} );
