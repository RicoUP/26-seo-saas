<?php
/**
 * Plugin Name: RankAI Connector
 * Description: One-click connection to your RankAI SEO dashboard. No API keys to copy paste.
 * Version: 1.0.0
 * Author: RankAI
 * License: GPL-2.0+
 * Text Domain: rankai-connector
 */

if (!defined('ABSPATH')) exit;

class RankAI_Connector {
    private static $instance = null;
    private $option_name = 'rankai_connector_secret';
    private $option_connected = 'rankai_connected';

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        register_activation_hook(__FILE__, [$this, 'activate']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_notices', [$this, 'show_connect_notice']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_init', [$this, 'handle_rankai_redirect']);
    }

    public function activate() {
        // Generate a secure one-time secret on activation
        $this->generate_secret();
    }

    private function generate_secret() {
        $secret = wp_generate_password(48, false, false);
        update_option($this->option_name, [
            'secret' => $secret,
            'created_at' => time(),
            'used' => false,
        ]);
    }

    public function add_admin_menu() {
        add_menu_page(
            'RankAI',
            'RankAI',
            'manage_options',
            'rankai-connector',
            [$this, 'render_admin_page'],
            'dashicons-admin-links',
            99
        );
    }

    public function show_connect_notice() {
        $connected = get_option($this->option_connected);
        if ($connected) return;

        $screen = get_current_screen();
        if (!$screen || $screen->id === 'toplevel_page_rankai-connector') return;

        $connect_url = $this->get_connect_url();
        echo '<div class="notice notice-info is-dismissible">';
        echo '<p><strong>RankAI Connector is ready!</strong> ';
        echo '<a href="' . esc_url($connect_url) . '" target="_blank" class="button button-primary" style="margin-left:8px;">Connect to RankAI</a>';
        echo '</p></div>';
    }

    public function render_admin_page() {
        $connected = get_option($this->option_connected);
        $connect_url = $this->get_connect_url();
        $disconnect_url = wp_nonce_url(admin_url('admin.php?page=rankai-connector&rankai_disconnect=1'), 'rankai_disconnect');
        ?>
        <div class="wrap">
            <h1>RankAI Connector</h1>
            <?php if ($connected): ?>
                <div class="notice notice-success">
                    <p><strong>✅ Connected!</strong> Your site is linked to RankAI. New content will publish here automatically.</p>
                </div>
                <p>
                    <a href="<?php echo esc_url($connect_url); ?>" target="_blank" class="button">Open RankAI Dashboard</a>
                    <a href="<?php echo esc_url($disconnect_url); ?>" class="button" style="margin-left:10px;color:#b32d2e;border-color:#b32d2e;" onclick="return confirm('Disconnect this site from RankAI?');">Disconnect</a>
                </p>
            <?php else: ?>
                <div class="card" style="max-width:600px;padding:20px;margin-top:20px;">
                    <h2>Connect to RankAI</h2>
                    <p>Click the button below to link this WordPress site to your RankAI dashboard. No API keys or passwords needed.</p>
                    <a href="<?php echo esc_url($connect_url); ?>" target="_blank" class="button button-primary button-hero" style="font-size:16px;">
                        🔗 Connect to RankAI
                    </a>
                    <p style="margin-top:20px;color:#666;font-size:13px;">
                        Site URL: <code><?php echo esc_html(get_site_url()); ?></code>
                    </p>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    private function get_connect_url() {
        $data = get_option($this->option_name);
        if (!$data || $data['used']) {
            $this->generate_secret();
            $data = get_option($this->option_name);
        }
        $saas_url = 'https://zchqu92m.eu-central.insforge.app'; // Will be overridden by frontend detection
        return 'https://rankai.app/settings?wp_connect=1'
            . '&site_url=' . urlencode(get_site_url())
            . '&secret=' . urlencode($data['secret'])
            . '&site_name=' . urlencode(get_bloginfo('name'))
            . '&wp_version=' . urlencode(get_bloginfo('version'));
    }

    public function handle_rankai_redirect() {
        if (!is_admin() || !current_user_can('manage_options')) return;

        // Handle disconnect
        if (isset($_GET['rankai_disconnect']) && wp_verify_nonce($_GET['_wpnonce'], 'rankai_disconnect')) {
            $this->disconnect();
            wp_redirect(admin_url('admin.php?page=rankai-connector'));
            exit;
        }
    }

    private function disconnect() {
        $app_pass = get_option($this->option_connected);
        if ($app_pass && is_array($app_pass) && !empty($app_pass['user_id'])) {
            // Revoke the application password we created
            if (class_exists('WP_Application_Passwords')) {
                WP_Application_Passwords::delete_application_password($app_pass['user_id'], $app_pass['pass_uuid']);
            }
        }
        delete_option($this->option_connected);
        delete_option($this->option_name);
        $this->generate_secret();
    }

    public function register_rest_routes() {
        register_rest_route('rankai/v1', '/connect', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_connect_request'],
            'permission_callback' => '__return_true', // We validate via secret
        ]);

        register_rest_route('rankai/v1', '/disconnect', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_disconnect_request'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function handle_connect_request($request) {
        $params = $request->get_json_params();
        $secret = sanitize_text_field($params['secret'] ?? '');
        $saas_url = esc_url_raw($params['saas_url'] ?? '');

        $stored = get_option($this->option_name);
        if (!$stored || $stored['used'] || $stored['secret'] !== $secret) {
            return new WP_Error('invalid_secret', 'Invalid or expired connection secret.', ['status' => 403]);
        }

        // Validate secret is not older than 10 minutes
        if (time() - ($stored['created_at'] ?? 0) > 600) {
            $this->generate_secret();
            return new WP_Error('secret_expired', 'Connection secret expired. Please refresh the page.', ['status' => 403]);
        }

        // Create application password for RankAI service
        $user_id = get_current_user_id() ?: get_users(['role' => 'administrator', 'number' => 1, 'fields' => 'ID'])[0] ?? 0;
        if (!$user_id) {
            return new WP_Error('no_user', 'No administrator user found.', ['status' => 500]);
        }

        $user = get_userdata($user_id);
        if (!class_exists('WP_Application_Passwords')) {
            return new WP_Error('no_app_passwords', 'WordPress Application Passwords not available. Requires WP 5.6+.', ['status' => 500]);
        }

        // Revoke any existing RankAI password first
        $existing = WP_Application_Passwords::get_user_application_passwords($user_id);
        foreach ($existing as $pass) {
            if (strpos($pass['name'], 'RankAI') === 0) {
                WP_Application_Passwords::delete_application_password($user_id, $pass['uuid']);
            }
        }

        // Create new application password
        $app_pass_result = WP_Application_Passwords::create_new_application_password(
            $user_id,
            [
                'name' => 'RankAI Connector ' . wp_generate_password(4, false, false),
            ]
        );

        if (is_wp_error($app_pass_result)) {
            return $app_pass_result;
        }

        $password = $app_pass_result['0']; // The plaintext password
        $pass_uuid = $app_pass_result['1']['uuid']; // The password UUID

        // Mark secret as used
        update_option($this->option_name, array_merge($stored, ['used' => true]));
        update_option($this->option_connected, [
            'user_id' => $user_id,
            'pass_uuid' => $pass_uuid,
            'connected_at' => time(),
        ]);

        return [
            'success' => true,
            'wp_url' => rest_url(),
            'username' => $user->user_login,
            'app_password' => $password,
            'site_name' => get_bloginfo('name'),
            'wp_version' => get_bloginfo('version'),
        ];
    }

    public function handle_disconnect_request($request) {
        $params = $request->get_json_params();
        $secret = sanitize_text_field($params['secret'] ?? '');
        $stored = get_option($this->option_name);

        if (!$stored || $stored['secret'] !== $secret) {
            return new WP_Error('invalid_secret', 'Invalid secret.', ['status' => 403]);
        }

        $this->disconnect();
        return ['success' => true];
    }
}

RankAI_Connector::get_instance();
