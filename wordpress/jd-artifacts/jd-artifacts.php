<?php
/**
 * Plugin Name:       JD Artifacts
 * Description:       Bindet Design-Artefakte aus dem Repository daimpad/jeff-dich per Shortcode ein: [jd_artifact id="…"].
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * License:           GPL-2.0-or-later
 * Text Domain:       jd-artifacts
 */

defined( 'ABSPATH' ) || exit;

const JD_ARTIFACTS_VERSION      = '0.1.0';
const JD_ARTIFACTS_DEFAULT_BASE = 'https://daimpad.github.io/jeff-dich';

/** Basis-URL, unter der die gebauten Artefakte liegen (GitHub Pages oder eigener Server). */
function jd_artifacts_base_url() {
	$url = trim( (string) get_option( 'jd_artifacts_base_url', '' ) );
	return untrailingslashit( $url !== '' ? $url : JD_ARTIFACTS_DEFAULT_BASE );
}

/** Version für Cache-Busting; in den Einstellungen nach einem Deploy erhöhen. */
function jd_artifacts_cache_version() {
	$ver = trim( (string) get_option( 'jd_artifacts_cache_version', '' ) );
	return $ver !== '' ? $ver : '1';
}

/**
 * [jd_artifact id="gsap-scroll-reveal"]
 *   mode="element" (Standard) Shadow-DOM-Element direkt in der Seite; Scroll-Animationen funktionieren.
 *   mode="iframe"             vollständig isoliert; Höhe passt sich an (height="auto") oder fest (height="600").
 *   height="…"                Pixel. Im element-Modus Mindesthöhe (vermeidet Layout-Sprung beim Laden).
 */
function jd_artifacts_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'id'     => '',
			'mode'   => 'element',
			'height' => 'auto',
		),
		$atts,
		'jd_artifact'
	);

	$id = strtolower( (string) $atts['id'] );
	if ( ! preg_match( '/^[a-z][a-z0-9-]*$/', $id ) ) {
		return current_user_can( 'edit_posts' ) ? '<!-- jd_artifact: ungültige id -->' : '';
	}

	$base   = jd_artifacts_base_url();
	$height = ( 'auto' === $atts['height'] ) ? 0 : absint( $atts['height'] );

	if ( 'iframe' === $atts['mode'] ) {
		wp_enqueue_script(
			'jd-artifacts-iframe',
			plugins_url( 'assets/iframe-resize.js', __FILE__ ),
			array(),
			JD_ARTIFACTS_VERSION,
			true
		);
		$src = add_query_arg( 'v', rawurlencode( jd_artifacts_cache_version() ), "{$base}/artifacts/{$id}/" );
		return sprintf(
			'<iframe class="jd-artifact-frame" src="%1$s" title="%2$s" loading="lazy" %3$s style="display:block;width:100%%;border:0;height:%4$s"></iframe>',
			esc_url( $src ),
			esc_attr( $id ),
			$height ? '' : 'data-jd-auto-height',
			$height ? $height . 'px' : '400px'
		);
	}

	wp_enqueue_script(
		"jd-artifact-{$id}",
		"{$base}/embed/{$id}.js",
		array(),
		jd_artifacts_cache_version(),
		true
	);
	return sprintf(
		'<jd-%1$s class="jd-artifact" style="display:block;%2$s"></jd-%1$s>',
		esc_attr( $id ),
		$height ? 'min-height:' . $height . 'px' : ''
	);
}
add_shortcode( 'jd_artifact', 'jd_artifacts_shortcode' );

/* ---------- Einstellungen: Einstellungen → JD Artifacts ---------- */

function jd_artifacts_register_settings() {
	register_setting( 'jd_artifacts', 'jd_artifacts_base_url', array( 'sanitize_callback' => 'esc_url_raw' ) );
	register_setting( 'jd_artifacts', 'jd_artifacts_cache_version', array( 'sanitize_callback' => 'sanitize_text_field' ) );

	add_settings_section( 'jd_artifacts_main', '', '__return_false', 'jd_artifacts' );
	add_settings_field(
		'jd_artifacts_base_url',
		'Basis-URL',
		function () {
			printf(
				'<input type="url" class="regular-text" name="jd_artifacts_base_url" value="%s" placeholder="%s" /><p class="description">Leer lassen für GitHub Pages.</p>',
				esc_attr( get_option( 'jd_artifacts_base_url', '' ) ),
				esc_attr( JD_ARTIFACTS_DEFAULT_BASE )
			);
		},
		'jd_artifacts',
		'jd_artifacts_main'
	);
	add_settings_field(
		'jd_artifacts_cache_version',
		'Cache-Version',
		function () {
			printf(
				'<input type="text" class="small-text" name="jd_artifacts_cache_version" value="%s" placeholder="1" /><p class="description">Nach einem neuen Deploy erhöhen, damit Browser die aktuelle Fassung laden.</p>',
				esc_attr( get_option( 'jd_artifacts_cache_version', '' ) )
			);
		},
		'jd_artifacts',
		'jd_artifacts_main'
	);
}
add_action( 'admin_init', 'jd_artifacts_register_settings' );

function jd_artifacts_settings_page() {
	add_options_page(
		'JD Artifacts',
		'JD Artifacts',
		'manage_options',
		'jd_artifacts',
		function () {
			echo '<div class="wrap"><h1>JD Artifacts</h1><form method="post" action="options.php">';
			settings_fields( 'jd_artifacts' );
			do_settings_sections( 'jd_artifacts' );
			submit_button();
			echo '</form><p>Einbinden: <code>[jd_artifact id="gsap-scroll-reveal"]</code> · Übersicht aller Artefakte: <a href="' . esc_url( jd_artifacts_base_url() . '/' ) . '" target="_blank" rel="noopener">Galerie</a></p></div>';
		}
	);
}
add_action( 'admin_menu', 'jd_artifacts_settings_page' );
