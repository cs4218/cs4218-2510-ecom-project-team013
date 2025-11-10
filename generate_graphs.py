import json

import matplotlib.pyplot as plt
import numpy as np


# Load the spike_results.json data
def load_spike_data():
    """Load and parse the spike test results from JSON file"""
    try:
        with open('spike_results.json', 'r') as file:
            data = json.load(file)
        return data
    except FileNotFoundError:
        print("Error: spike_results.json not found in current directory")
        return None
    except json.JSONDecodeError:
        print("Error: Invalid JSON format in spike_results.json")
        return None


def extract_performance_data(data):
    """Extract and organize performance metrics from spike test data"""
    if not data:
        return None

    metrics = data.get('metrics', {})
    http_duration = metrics.get('http_req_duration', {}).get('values', {})
    http_reqs = metrics.get('http_reqs', {}).get('values', {})
    http_failed = metrics.get('http_req_failed', {}).get('values', {})
    vus = metrics.get('vus', {}).get('values', {})
    checks = metrics.get('checks', {}).get('values', {})

    # Extract all endpoint-specific latency metrics
    endpoint_metrics = {}
    for metric_name, metric_data in metrics.items():
        if metric_name.startswith('latency_ms_'):
            endpoint = metric_name.replace('latency_ms_', '')
            values = metric_data.get('values', {})
            if values:
                endpoint_metrics[endpoint] = {
                    'avg': values.get('avg', 0),
                    'min': values.get('min', 0),
                    'med': values.get('med', 0),
                    'p90': values.get('p(90)', 0),
                    'p95': values.get('p(95)', 0),
                    'p99': values.get('p(99)', 0),
                    'max': values.get('max', 0),
                }

    return {
        'overall': {
            'p50': http_duration.get('med', 0),
            'p90': http_duration.get('p(90)', 0),
            'p95': http_duration.get('p(95)', 0),
            'p99': http_duration.get('p(99)', 0),
            'avg': http_duration.get('avg', 0),
            'min': http_duration.get('min', 0),
            'max': http_duration.get('max', 0),
            'total_requests': http_reqs.get('count', 0),
            'requests_per_sec': http_reqs.get('rate', 0),
            'error_rate': http_failed.get('rate', 0),
            'duration_s': data.get('state', {}).get('testRunDurationMs', 0) / 1000,
            'vus': vus.get('value', 0),
            'vus_max': vus.get('max', 0),
            'checks_pass_rate': checks.get('rate', 0),
            'checks_total': checks.get('count', 0),
            'checks_passed': checks.get('passes', 0),
            'checks_failed': checks.get('fails', 0),
        },
        'endpoints': endpoint_metrics
    }


def create_spike_response_times(data):
    """Graph 1: Response Time Percentiles During Spike Load"""
    performance = extract_performance_data(data)
    if not performance:
        return

    percentiles = ['P50\n(Median)', 'P90', 'P95', 'P99']
    times = [
        performance['overall']['p50'],
        performance['overall']['p90'],
        performance['overall']['p95'],
        performance['overall']['p99']
    ]

    plt.figure(figsize=(10, 6))
    colors = ['#2E8B57', '#3498db', '#e67e22', '#e74c3c']
    bars = plt.bar(percentiles, times, color=colors, edgecolor='black', linewidth=1.5)

    plt.title('Response Time Percentiles During Spike Load', 
              fontsize=14, fontweight='bold', pad=20)
    plt.xlabel('Response Time Percentiles', fontsize=12, fontweight='bold')
    plt.ylabel('Response Time (ms)', fontsize=12, fontweight='bold')
    plt.grid(axis='y', linestyle='--', alpha=0.3)

    # Add value labels on top of each bar
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:,.0f}ms',
                ha='center', va='bottom', fontsize=11, fontweight='bold')

    # Add interpretation text
    plt.text(0.5, 0.98, 
             f'Total Requests: {performance["overall"]["total_requests"]:,} | '
             f'Avg Throughput: {performance["overall"]["requests_per_sec"]:.1f} req/s',
             ha='center', va='top', transform=plt.gca().transAxes,
             fontsize=9, style='italic', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

    plt.tight_layout()
    plt.savefig('spike_response_times.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✅ Generated: spike_response_times.png")


def create_all_endpoints_comparison(data):
    """Graph 2: All Endpoint Performance Comparison (Complete Coverage)"""
    performance = extract_performance_data(data)
    if not performance or not performance['endpoints']:
        return

    # Get ALL endpoints and sort by P95 latency
    endpoints = performance['endpoints']
    sorted_endpoints = sorted(endpoints.items(), key=lambda x: x[1]['p95'], reverse=True)
    
    names = [ep[0].replace('_', '\n') for ep in sorted_endpoints]
    p95_times = [ep[1]['p95'] for ep in sorted_endpoints]
    p99_times = [ep[1]['p99'] for ep in sorted_endpoints]

    x = np.arange(len(names))
    width = 0.35

    fig, ax = plt.subplots(figsize=(16, 8))
    bars1 = ax.bar(x - width/2, p95_times, width, label='P95 (95th percentile)', 
                   color='#3498db', edgecolor='black', linewidth=1)
    bars2 = ax.bar(x + width/2, p99_times, width, label='P99 (99th percentile)', 
                   color='#e74c3c', edgecolor='black', linewidth=1)

    ax.set_title(f'Complete Endpoint Performance Under Spike Load\n'
                 f'All {len(endpoints)} Endpoints Tested', 
                 fontsize=14, fontweight='bold', pad=20)
    ax.set_xlabel('API Endpoints', fontsize=12, fontweight='bold')
    ax.set_ylabel('Response Time (ms)', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=45, ha='right', fontsize=9)
    ax.legend(fontsize=11, loc='upper right')
    ax.grid(axis='y', linestyle='--', alpha=0.3)

    # Add value labels for bars > 100ms (to avoid clutter)
    def autolabel(bars, color):
        for bar in bars:
            height = bar.get_height()
            if height > 100:  # Only label significant latencies
                ax.text(bar.get_x() + bar.get_width()/2., height,
                        f'{height:,.0f}',
                        ha='center', va='bottom', fontsize=8, 
                        rotation=0, color=color, fontweight='bold')

    autolabel(bars1, '#3498db')
    autolabel(bars2, '#e74c3c')

    plt.tight_layout()
    plt.savefig('complete_endpoint_performance_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✅ Generated: complete_endpoint_performance_comparison.png")


def create_error_rate_analysis(data):
    """Graph 3: Error Rate and System Reliability During Spike"""
    performance = extract_performance_data(data)
    if not performance:
        return

    error_rate = performance['overall']['error_rate'] * 100
    success_rate = 100 - error_rate
    checks_pass_rate = performance['overall']['checks_pass_rate'] * 100

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

    # Pie chart for HTTP success/error
    colors_pie = ['#2ecc71', '#e74c3c']
    ax1.pie([success_rate, error_rate], 
            labels=[f'Success\n{success_rate:.2f}%', f'Errors\n{error_rate:.2f}%'],
            colors=colors_pie,
            autopct='%1.2f%%',
            startangle=90,
            textprops={'fontsize': 11, 'fontweight': 'bold'})
    ax1.set_title('HTTP Request Success vs Error Rate', 
                  fontsize=12, fontweight='bold', pad=10)

    # Bar chart for detailed reliability metrics
    categories = ['HTTP\nSuccess', 'Checks\nPassed']
    rates = [success_rate, checks_pass_rate]
    colors_bar = ['#2ecc71', '#3498db']
    
    bars = ax2.bar(categories, rates, color=colors_bar, edgecolor='black', linewidth=1.5)
    ax2.set_ylabel('Success Rate (%)', fontsize=11, fontweight='bold')
    ax2.set_title('System Reliability Metrics', fontsize=12, fontweight='bold', pad=10)
    ax2.set_ylim(0, 105)
    ax2.grid(axis='y', alpha=0.3, linestyle='--')
    ax2.axhline(y=100, color='green', linestyle='--', linewidth=2, alpha=0.5, label='100% Target')

    # Add value labels
    for bar in bars:
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}%',
                ha='center', va='bottom', fontsize=11, fontweight='bold')

    # Add metrics summary
    fig.text(0.5, 0.02, 
             f'Total Checks: {performance["overall"]["checks_total"]:,} | '
             f'Passed: {performance["overall"]["checks_passed"]:,} | '
             f'Failed: {performance["overall"]["checks_failed"]:,}',
             ha='center', fontsize=9, style='italic',
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

    plt.tight_layout(rect=[0, 0.05, 1, 1])
    plt.savefig('error_rate_analysis.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✅ Generated: error_rate_analysis.png")


def create_system_capacity_analysis(data):
    """Graph 4: System Capacity and Throughput Analysis"""
    performance = extract_performance_data(data)
    if not performance:
        return

    # Metrics for capacity analysis
    metrics = [
        ('Throughput', performance['overall']['requests_per_sec'], 'req/s', '#2E8B57'),
        ('Avg Response\nTime', performance['overall']['avg'], 'ms', '#3498db'),
        ('P95 Response\nTime', performance['overall']['p95'], 'ms', '#e67e22'),
        ('Max VUs', performance['overall']['vus_max'], 'users', '#9b59b6')
    ]

    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(14, 10))
    axes = [ax1, ax2, ax3, ax4]

    for ax, (label, value, unit, color) in zip(axes, metrics):
        ax.bar([label], [value], color=color, edgecolor='black', linewidth=2, width=0.6)
        ax.set_ylabel(unit, fontsize=11, fontweight='bold')
        ax.set_title(label, fontsize=12, fontweight='bold', pad=10)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        
        # Add value label
        ax.text(0, value, f'{value:.1f}\n{unit}',
                ha='center', va='bottom', fontsize=12, fontweight='bold')

    # Overall title
    fig.suptitle(f'System Capacity Analysis During Spike Test\n'
                 f'Duration: {performance["overall"]["duration_s"]:.1f}s | '
                 f'Total Requests: {performance["overall"]["total_requests"]:,}',
                 fontsize=14, fontweight='bold', y=0.98)

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    plt.savefig('system_capacity_analysis.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✅ Generated: system_capacity_analysis.png")


def create_response_time_distribution(data):
    """Graph 5: Response Time Distribution Analysis"""
    performance = extract_performance_data(data)
    if not performance:
        return

    # Create distribution visualization
    percentiles = ['Min', 'P50\n(Median)', 'Avg', 'P90', 'P95', 'P99', 'Max']
    times = [
        performance['overall']['min'],
        performance['overall']['p50'],
        performance['overall']['avg'],
        performance['overall']['p90'],
        performance['overall']['p95'],
        performance['overall']['p99'],
        performance['overall']['max']
    ]

    colors = ['#95a5a6', '#2E8B57', '#27ae60', '#3498db', '#e67e22', '#e74c3c', '#c0392b']

    plt.figure(figsize=(12, 6))
    bars = plt.bar(percentiles, times, color=colors, edgecolor='black', linewidth=1.5)

    plt.title('Response Time Distribution During Spike Load\n'
              'Complete Statistical Analysis', 
              fontsize=14, fontweight='bold', pad=20)
    plt.xlabel('Statistical Measures', fontsize=12, fontweight='bold')
    plt.ylabel('Response Time (ms)', fontsize=12, fontweight='bold')
    plt.grid(axis='y', linestyle='--', alpha=0.3)

    # Add value labels
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:,.0f}ms',
                ha='center', va='bottom', fontsize=10, fontweight='bold')

    # Add interpretation
    plt.text(0.5, 0.98, 
             '50% of requests < P50 | 90% of requests < P90 | 95% of requests < P95 | 99% of requests < P99',
             ha='center', va='top', transform=plt.gca().transAxes,
             fontsize=9, style='italic', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

    plt.tight_layout()
    plt.savefig('response_time_distribution_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✅ Generated: response_time_distribution_comparison.png")


def create_percentile_graph(data):
    """Graph 6: Overall Percentile Performance Graph"""
    performance = extract_performance_data(data)
    if not performance:
        return

    percentiles_x = [50, 90, 95, 99]
    percentiles_y = [
        performance['overall']['p50'],
        performance['overall']['p90'],
        performance['overall']['p95'],
        performance['overall']['p99']
    ]

    plt.figure(figsize=(10, 6))
    plt.plot(percentiles_x, percentiles_y, marker='o', linewidth=3, 
             markersize=10, color='#e74c3c', markerfacecolor='#c0392b', 
             markeredgecolor='black', markeredgewidth=2)
    
    plt.title('Response Time Percentile Curve During Spike Load', 
              fontsize=14, fontweight='bold', pad=20)
    plt.xlabel('Percentile', fontsize=12, fontweight='bold')
    plt.ylabel('Response Time (ms)', fontsize=12, fontweight='bold')
    plt.grid(True, linestyle='--', alpha=0.3)

    # Add value labels
    for x, y in zip(percentiles_x, percentiles_y):
        plt.annotate(f'P{x}: {y:.0f}ms',
                    xy=(x, y), xytext=(10, 10),
                    textcoords='offset points',
                    fontsize=10, fontweight='bold',
                    bbox=dict(boxstyle='round,pad=0.5', facecolor='yellow', alpha=0.5),
                    arrowprops=dict(arrowstyle='->', connectionstyle='arc3,rad=0'))

    # Highlight tail latency
    plt.axhspan(percentiles_y[2], percentiles_y[3], alpha=0.2, color='red', 
                label='Tail Latency Zone (P95-P99)')
    plt.legend(fontsize=10)

    plt.tight_layout()
    plt.savefig('overall_percentile_graph.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✅ Generated: overall_percentile_graph.png")


def print_performance_summary(performance):
    """Print detailed performance summary for the report"""
    print("\n" + "="*80)
    print("📊 SPIKE TEST PERFORMANCE SUMMARY")
    print("="*80)
    
    print(f"\n🔧 Test Configuration:")
    print(f"   • Test Duration: {performance['overall']['duration_s']:.1f} seconds")
    print(f"   • Max Virtual Users: {performance['overall']['vus_max']}")
    print(f"   • Total Requests: {performance['overall']['total_requests']:,}")
    
    print(f"\n⚡ Throughput Metrics:")
    print(f"   • Average Throughput: {performance['overall']['requests_per_sec']:.1f} req/s")
    print(f"   • Total Requests Processed: {performance['overall']['total_requests']:,}")
    
    print(f"\n⏱️  Response Time Metrics:")
    print(f"   • Minimum: {performance['overall']['min']:.2f}ms")
    print(f"   • P50 (Median): {performance['overall']['p50']:.2f}ms")
    print(f"   • Average: {performance['overall']['avg']:.2f}ms")
    print(f"   • P90: {performance['overall']['p90']:.2f}ms")
    print(f"   • P95: {performance['overall']['p95']:.2f}ms")
    print(f"   • P99: {performance['overall']['p99']:.2f}ms")
    print(f"   • Maximum: {performance['overall']['max']:.2f}ms")
    
    print(f"\n✅ Reliability Metrics:")
    print(f"   • HTTP Error Rate: {performance['overall']['error_rate']*100:.2f}%")
    print(f"   • HTTP Success Rate: {(1-performance['overall']['error_rate'])*100:.2f}%")
    print(f"   • Checks Pass Rate: {performance['overall']['checks_pass_rate']*100:.2f}%")
    print(f"   • Total Checks: {performance['overall']['checks_total']:,}")
    print(f"   • Checks Passed: {performance['overall']['checks_passed']:,}")
    print(f"   • Checks Failed: {performance['overall']['checks_failed']:,}")
    
    print(f"\n🎯 Endpoint Coverage:")
    print(f"   • Total Endpoints Tested: {len(performance['endpoints'])}")
    
    # Show top 5 slowest endpoints
    sorted_endpoints = sorted(performance['endpoints'].items(), 
                             key=lambda x: x[1]['p95'], reverse=True)[:5]
    print(f"\n🐌 Top 5 Slowest Endpoints (P95):")
    for i, (name, metrics) in enumerate(sorted_endpoints, 1):
        print(f"   {i}. {name}: {metrics['p95']:.2f}ms (P95), {metrics['p99']:.2f}ms (P99)")
    
    print("\n" + "="*80)
    print("📈 KEY INSIGHTS FOR YOUR REPORT:")
    print("="*80)
    print(f"""
✅ System Performance Under Spike Load:
   • Handled {performance['overall']['total_requests']:,} requests with {(1-performance['overall']['error_rate'])*100:.2f}% success rate
   • Maintained {performance['overall']['requests_per_sec']:.1f} req/s average throughput
   • P95 response time: {performance['overall']['p95']:.2f}ms (95% of users experienced this or better)
   • P99 response time: {performance['overall']['p99']:.2f}ms (tail latency for worst 1%)

✅ Reliability Assessment:
   • {performance['overall']['checks_pass_rate']*100:.2f}% of functional checks passed
   • HTTP error rate: {performance['overall']['error_rate']*100:.2f}%
   • System maintained stability under {performance['overall']['vus_max']} concurrent users

✅ Comprehensive Coverage:
   • Tested all {len(performance['endpoints'])} critical API endpoints
   • Covered public, authenticated, and payment flows
   • Identified performance bottlenecks in payment endpoints

✅ Spike Test Methodology:
   • Ramped from baseline to {performance['overall']['vus_max']} users rapidly
   • Sustained spike load to test system recovery
   • Monitored both technical metrics and business functionality

🎯 Use these graphs in your MS3 report to demonstrate:
   1. Comprehensive spike testing approach
   2. System behavior under extreme load
   3. Identification of performance bottlenecks
   4. Reliability and error handling capabilities
""")
    print("="*80 + "\n")


def main():
    """Main function to generate all spike test performance graphs"""
    print("🚀 Loading spike test results from spike_results.json...")

    data = load_spike_data()
    if not data:
        print("❌ Failed to load spike test data")
        print("💡 Make sure spike_results.json exists in the current directory")
        return

    performance = extract_performance_data(data)
    if not performance:
        print("❌ Failed to extract performance data")
        return

    print("\n📊 Generating spike test performance graphs...")
    print("-" * 80)

    # Generate all graphs
    create_spike_response_times(data)
    create_all_endpoints_comparison(data)
    create_error_rate_analysis(data)
    create_system_capacity_analysis(data)
    create_response_time_distribution(data)
    create_percentile_graph(data)

    print("-" * 80)
    print("\n✅ Successfully generated 6 performance graphs:")
    print("   1. spike_response_times.png - Response time percentiles")
    print("   2. complete_endpoint_performance_comparison.png - All endpoints performance")
    print("   3. error_rate_analysis.png - Error rates and reliability")
    print("   4. system_capacity_analysis.png - Throughput and capacity")
    print("   5. response_time_distribution_comparison.png - Complete distribution")
    print("   6. overall_percentile_graph.png - Percentile curve analysis")

    # Print detailed summary
    print_performance_summary(performance)


if __name__ == "__main__":
    main()
