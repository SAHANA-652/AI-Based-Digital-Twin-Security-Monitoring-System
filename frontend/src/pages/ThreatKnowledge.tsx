import React, { useState } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  BookOpen, Search, ShieldAlert, Cpu, HardDrive,
  Wifi, Activity, AlertTriangle, ChevronDown, ChevronUp, Layers
} from 'lucide-react';

interface ThreatItem {
  id: string;
  name: string;
  category: 'Malware' | 'Attacks' | 'System Bottlenecks';
  whatItIs: string;
  behavior: string;
  indicators: string;
  detectableTelemetry: string;
  limitations: string;
  digitalTwinRelevance: string;
  recommendedResponse: string;
}

const threatDatabase: ThreatItem[] = [
  // 1-10 Malware
  {
    id: 'virus',
    name: 'Computer Virus',
    category: 'Malware',
    whatItIs: 'Malicious code that attaches itself to legitimate host programs or files and propagates when executed.',
    behavior: 'Injects into executables, modifies file sizes, corrupts code integrity, and executes payload during normal host execution.',
    indicators: 'Modified file timestamps, unexpected file size increases, sudden CPU spikes on normally lightweight utilities.',
    detectableTelemetry: 'Process CPU/Memory bursts, rapid disk modification bursts, unexpected child process spawning.',
    limitations: 'Static signatures or infected file hashes cannot be verified without deep file system scans; Digital Twin detects runtime behavioral anomalies rather than byte signatures.',
    digitalTwinRelevance: 'The Digital Twin detects the deviation when a trusted utility consumes abnormal resources or spawns abnormal sub-processes.',
    recommendedResponse: 'Isolate affected user account, inspect process execution tree, verify executable SHA256 integrity, audit disk write history.'
  },
  {
    id: 'worm',
    name: 'Network Worm',
    category: 'Malware',
    whatItIs: 'Self-replicating malware that spreads across local networks or the internet without requiring host program execution.',
    behavior: 'Scans network ranges, floods socket connections, exploits vulnerable services, and rapidly propagates.',
    indicators: 'Surge in active socket connections, rapid SYN packet transmission, elevated upload throughput, port scanning activity.',
    detectableTelemetry: 'Network connection count spike, high outbound bandwidth, elevated CPU utilization, repetitive connection attempts on unusual ports.',
    limitations: 'Encrypted payload contents cannot be inspected; detection relies on connection rates and socket density anomalies.',
    digitalTwinRelevance: 'Digital Twin models normal socket concurrency (e.g. 30-50 sockets) and triggers alert when socket count surges to hundreds.',
    recommendedResponse: 'Inspect active socket destinations, trace remote IPs via Threat Intel, examine initiating PID, apply network segmentation.'
  },
  {
    id: 'trojan',
    name: 'Trojan Horse',
    category: 'Malware',
    whatItIs: 'Malware disguised as legitimate software that grants unauthorized background access or stealthy execution.',
    behavior: 'Presents as a normal application while silently establishing outbound command-and-control (C2) channels.',
    indicators: 'Unexpected outbound connections from user-space utilities, execution from AppData/Temp paths, persistent background execution.',
    detectableTelemetry: 'New remote IP connections on non-standard ports, sustained low-level CPU/network consumption during idle hours.',
    limitations: 'Sophisticated Trojans mimic standard HTTPS web traffic; detection requires correlating unusual paths with unexpected active hours.',
    digitalTwinRelevance: 'Digital Twin correlates execution path with time-of-day baselines to flag processes active during uncharacteristic intervals.',
    recommendedResponse: 'Inspect process command-line arguments, verify binary digital signatures, check remote IP reputation in Threat Intel.'
  },
  {
    id: 'ransomware',
    name: 'Ransomware',
    category: 'Malware',
    whatItIs: 'Extortion malware that rapidly encrypts user documents and system files, demanding payment for decryption keys.',
    behavior: 'Enumerates directories, performs massive high-frequency sequential disk read/writes, and terminates volume shadow services.',
    indicators: 'Extreme disk write bursts, sudden rename operations, rapid process spawning from user-writable directories.',
    detectableTelemetry: 'Disk write throughput surges (hundreds of MB/s), sustained high CPU usage by a single user process, process creation frequency spikes.',
    limitations: 'Monitoring alone does not stop encryption; fast detection provides critical early warning for human security triage before complete volume compromise.',
    digitalTwinRelevance: 'Digital Twin baseline models typical disk write rates (e.g. 5-15 MB/s) and immediately flags sudden 100+ MB/s bursts as high-severity anomalies.',
    recommendedResponse: 'IMMEDIATELY isolate network interfaces, verify backup integrity, identify originating process PID, preserve forensic memory snapshot.'
  },
  {
    id: 'spyware',
    name: 'Spyware / Info-Stealer',
    category: 'Malware',
    whatItIs: 'Stealth software designed to harvest sensitive credentials, browser cookies, keystrokes, and documents.',
    behavior: 'Periodically reads credential stores, archives captured data into temp archives, and uploads payloads in compressed batches.',
    indicators: 'Periodic outbound upload bursts to unfamiliar IPs, background processes reading browser profile folders.',
    detectableTelemetry: 'Periodic outbound bandwidth pulses, background memory growth, active sockets from uncommon processes.',
    limitations: 'Data exfiltration using legitimate protocols (e.g. HTTPS to Discord or Telegram APIs) requires correlation with process paths.',
    digitalTwinRelevance: 'Digital Twin identifies uncharacteristic upload volumes from processes that typically have zero network footprint.',
    recommendedResponse: 'Revoke compromised session tokens, inspect process network endpoints, audit local temp directories for staged archives.'
  },
  {
    id: 'adware',
    name: 'Adware',
    category: 'Malware',
    whatItIs: 'Unwanted software that injects advertising, redirects browser queries, and gathers user marketing analytics.',
    behavior: 'Spawns frequent helper processes, makes numerous HTTP/DNS queries, and persistently consumes modest background resources.',
    indicators: 'Elevated concurrent socket connections, repetitive DNS lookups to ad networks, persistent process auto-restart.',
    detectableTelemetry: 'Moderate CPU elevation, consistent socket counts, process count inflation.',
    limitations: 'Often operates as signed or bundled utilities; behavioral impact is primarily resource and privacy degradation.',
    digitalTwinRelevance: 'Flags baseline deviation in process count and continuous background network polling.',
    recommendedResponse: 'Review browser extensions, verify startup items and scheduled tasks, inspect parent installer processes.'
  },
  {
    id: 'rootkit',
    name: 'Rootkit',
    category: 'Malware',
    whatItIs: 'Stealth malware designed to maintain privileged kernel/system access while actively hiding its presence from OS utilities.',
    behavior: 'Hooks system calls, manipulates kernel process lists, and hides network sockets and disk files.',
    indicators: 'Discrepancies between low-level hardware counters (high CPU usage/temperature) and visible OS process tables.',
    detectableTelemetry: 'High CPU core temperature or power consumption without matching process-level CPU accountability.',
    limitations: 'Ring 0 rootkits can deceive user-mode telemetry APIs (psutil); physical sensor discrepancies are essential indicators.',
    digitalTwinRelevance: 'The Digital Twin correlates hardware temperature and total CPU load against the sum of visible process usage to expose invisible workloads.',
    recommendedResponse: 'Perform offline boot media scanning, inspect kernel driver signatures, audit system integrity records.'
  },
  {
    id: 'keylogger',
    name: 'Keylogger',
    category: 'Malware',
    whatItIs: 'Surveillance tool recording raw keyboard, clipboard, and input hardware events.',
    behavior: 'Installs global input hooks, logs input sequences to hidden local buffers, and periodically transmits logs.',
    indicators: 'Lightweight background process running continuously with low CPU and periodic outbound transmissions.',
    detectableTelemetry: 'Persistent process runtime, periodic micro-upload bursts, background RAM retention.',
    limitations: 'Consumes minimal CPU; requires behavioral correlation between memory persistence and periodic network transmission.',
    digitalTwinRelevance: 'Identifies unknown background processes maintaining long-lived runtime without matching user-facing workload context.',
    recommendedResponse: 'Audit installed global input hooks, inspect user startup items, verify active process execution locations.'
  },
  {
    id: 'botnet',
    name: 'Botnet Agent',
    category: 'Malware',
    whatItIs: 'Compromised node operating under the remote command of a botmaster for coordinated DDoS, scanning, or spam.',
    behavior: 'Maintains persistent heartbeat connections to C2 servers and suddenly transitions into aggressive flooding or scanning on command.',
    indicators: 'Persistent long-lived TCP sockets, abrupt transitions from idle state to massive network or CPU activity.',
    detectableTelemetry: 'Network connection count bursts, outbound packet rate surges, high upload bandwidth, ML cluster state transitions.',
    limitations: 'Heartbeat traffic is lightweight; detection triggers decisively when attack commands activate high-volume activity.',
    digitalTwinRelevance: 'K-Means clustering and Autoencoder detect sudden state transitions from Normal Work to Network Intensive / Heavy Workload.',
    recommendedResponse: 'Terminate remote C2 connection, cross-reference remote IPs with Threat Intel, inspect scheduled tasks.'
  },
  {
    id: 'cryptominer',
    name: 'Cryptominer / Cryptojacking',
    category: 'Malware',
    whatItIs: 'Unauthorized software that hijacks CPU and GPU hardware to mine cryptocurrency for malicious actors.',
    behavior: 'Consistently saturates CPU/GPU cores at near 100% capacity, triggers high thermal output, and connects to mining pools.',
    indicators: 'Sustained 90-100% CPU usage, elevated core temperatures, connection to Stratum/mining pool ports (3333, 4444, etc.).',
    detectableTelemetry: 'Extreme CPU utilization, elevated CPU/GPU temperature, Stratum protocol ports, persistent high load average.',
    limitations: 'Must be differentiated from legitimate heavy compilation, rendering, or gaming workloads using user context.',
    digitalTwinRelevance: 'Correlates sustained high CPU with unusual network ports (Stratum) and non-interactive process paths to avoid false positives on gaming.',
    recommendedResponse: 'Identify the top CPU-consuming process, inspect associated network sockets, verify executable directory origin.'
  },

  // 11-17 Attacks
  {
    id: 'brute_force',
    name: 'Brute Force Authentication',
    category: 'Attacks',
    whatItIs: 'Automated repetitive credential guessing attack attempting to gain access to user or administrative accounts.',
    behavior: 'Generates rapid succession of failed logon requests against local or remote services (SSH, RDP, SMB, Web).',
    indicators: 'Spike in authentication failure events (Windows Event ID 4625), rapid authentication attempts per second.',
    detectableTelemetry: 'High failed login frequency, repeated auth events from single source, authentication analyzer risk score elevation.',
    limitations: 'Requires OS security log parsing capabilities and elevated permissions to inspect security event logs.',
    digitalTwinRelevance: 'Baseline models normal logon frequency (e.g. 0-1 failures) and triggers critical alerts when failures exceed 5-10 attempts.',
    recommendedResponse: 'Temporarily lock affected account, block offending source IP, enforce multi-factor authentication (MFA).'
  },
  {
    id: 'ddos',
    name: 'DDoS / Network Flood',
    category: 'Attacks',
    whatItIs: 'Overwhelming volume of incoming or outgoing traffic aimed at saturating bandwidth and exhausting socket buffers.',
    behavior: 'Floods network interfaces with SYN packets, UDP datagrams, or ICMP echoes to cause denial of service.',
    indicators: 'Inbound or outbound bandwidth saturation, extreme packet rates, socket connection table exhaustion.',
    detectableTelemetry: 'Network packet rate surges, high bandwidth utilization, dropped packets, system responsiveness degradation.',
    limitations: 'Volumetric DDoS targeting internet gateways may saturate uplink before host detection; host monitors endpoint buffer saturation.',
    digitalTwinRelevance: 'Isolation Forest and Autoencoder detect multi-standard-deviation bursts in packet counters and socket density.',
    recommendedResponse: 'Implement upstream rate limiting, filter attack traffic via firewall rules, inspect initiating host sockets.'
  },
  {
    id: 'data_exfiltration',
    name: 'Data Exfiltration',
    category: 'Attacks',
    whatItIs: 'Unauthorized transmission of confidential data from a protected computer to an external adversarial endpoint.',
    behavior: 'Uploads large aggregate data volumes to unusual remote IP addresses or cloud services over prolonged intervals.',
    indicators: 'High outbound-to-inbound bandwidth ratio, large upload transfers during off-hours, connections to unlisted external IPs.',
    detectableTelemetry: 'Network upload rate significantly exceeding baseline, abnormal upload/download ratio, new external IP sockets.',
    limitations: 'Encrypted traffic contents cannot be inspected; detection relies on volume, timing, and destination reputation.',
    digitalTwinRelevance: 'Digital Twin models normal outbound bandwidth expectation and flags sustained high-volume uploads as suspicious.',
    recommendedResponse: 'Inspect transmitting process PID, check remote IP reputation in Threat Intel, audit user access to exfiltrated files.'
  },
  {
    id: 'priv_esc',
    name: 'Privilege Escalation',
    category: 'Attacks',
    whatItIs: 'Exploitation of vulnerabilities or misconfigurations to elevate user access privileges to SYSTEM or root level.',
    behavior: 'Spawns privileged administrative processes from unprivileged user contexts, modifies token privileges.',
    indicators: 'Standard user process spawning elevated shells (e.g. cmd.exe or bash running under SYSTEM/root).',
    detectableTelemetry: 'Abnormal parent-child process tree relationships, unexpected process token username transitions.',
    limitations: 'Legitimate administrative tools (UAC/sudo) also elevate processes; requires contextual analysis of initiating parent.',
    digitalTwinRelevance: 'Heuristic engine checks parent-child relationships (e.g. winword.exe spawning powershell.exe) to flag abnormal hierarchy.',
    recommendedResponse: 'Investigate parent process lineage, audit user session rights, verify system patch levels for privilege vulnerabilities.'
  },
  {
    id: 'persistence',
    name: 'Persistence Mechanism',
    category: 'Attacks',
    whatItIs: 'Technique used by adversaries to retain access across system reboots, user logoffs, and credential changes.',
    behavior: 'Registers auto-start registry keys, installs persistent background services, creates scheduled tasks or cron jobs.',
    indicators: 'New unknown binaries running immediately at boot, processes starting from user temp or roaming paths.',
    detectableTelemetry: 'High process creation rate at boot, unknown long-running processes starting from user-writable directories.',
    limitations: 'Static registry inspection requires direct OS registry access; Digital Twin monitors runtime process emergence.',
    digitalTwinRelevance: 'Tracks process emergence history and identifies new, unverified processes running at system initialization.',
    recommendedResponse: 'Audit scheduled tasks, inspect startup folder and Run keys, remove unauthorized auto-start entries.'
  },
  {
    id: 'proc_injection',
    name: 'Process Injection / Hollow',
    category: 'Attacks',
    whatItIs: 'Technique where malicious code is injected into the address space of a legitimate, trusted running process (e.g. svchost.exe).',
    behavior: 'Allocates virtual memory in target process, writes shellcode, and creates remote execution thread.',
    indicators: 'Legitimate system processes exhibiting unexpected network connections, high CPU usage, or abnormal child spawning.',
    detectableTelemetry: 'System process CPU/memory deviations, svchost or explorer establishing unusual outbound network connections.',
    limitations: 'Deep memory inspection requires specialized kernel drivers; Digital Twin detects telemetric behavioral deviations in trusted processes.',
    digitalTwinRelevance: 'Digital Twin compares actual behavior of system processes against baseline expectations, exposing injected behavior.',
    recommendedResponse: 'Inspect process memory regions for executable unbacked pages, examine socket connections, isolate affected host.'
  },
  {
    id: 'suspicious_net',
    name: 'Suspicious Network Communication',
    category: 'Attacks',
    whatItIs: 'Anomalous socket traffic including beaconing, dynamic DNS queries, and non-standard protocol usage.',
    behavior: 'Establishes regular interval connections (beaconing) to low-reputation remote IP endpoints or dynamic domains.',
    indicators: 'Periodic connection pulses, connections to unusual ports (e.g. 4444, 8888, 1337), unlisted remote IP addresses.',
    detectableTelemetry: 'Repetitive network connection timing, unusual remote port usage, Threat Intel indicator matches.',
    limitations: 'Legitimate web applications and telemetry services also beacon; requires correlation with process name and reputation.',
    digitalTwinRelevance: 'Correlates process identity with remote port and Threat Intel lookup to distinguish normal telemetry from C2 beaconing.',
    recommendedResponse: 'Query remote IP in Threat Intelligence, inspect originating executable path, review DNS query logs.'
  },

  // 18-22 System Bottlenecks
  {
    id: 'mem_leak',
    name: 'Memory Leak',
    category: 'System Bottlenecks',
    whatItIs: 'Software defect where dynamically allocated memory is never released, causing continuous RAM consumption.',
    behavior: 'A single process steadily grows in Resident Set Size (RSS) over hours or days until system memory is exhausted.',
    indicators: 'Monotonically increasing RAM usage, high swap/pagefile utilization, system sluggishness, out-of-memory errors.',
    detectableTelemetry: 'Gradual upward slope in RAM percentage, steady growth in process RSS memory, increasing swap utilization.',
    limitations: 'Distinguishing intentional memory caching from true leaks requires observing growth trends across hours.',
    digitalTwinRelevance: 'Digital Twin rolling averages and historical trend charts highlight monotonic memory accumulation across time.',
    recommendedResponse: 'Identify the leaking PID in Process Monitor, restart the application service, file bug report with software vendor.'
  },
  {
    id: 'cpu_saturation',
    name: 'CPU Saturation / Bottleneck',
    category: 'System Bottlenecks',
    whatItIs: 'Condition where compute demand exceeds total hardware processor capacity, degrading system responsiveness.',
    behavior: 'High thread contention, elevated context switching, high load averages exceeding total physical/logical core counts.',
    indicators: 'CPU usage pinned at 100%, high load averages (e.g. 8.0 on a 4-core CPU), sluggish user interface response.',
    detectableTelemetry: '100% CPU usage, load average higher than core count, multiple processes contending for execution time.',
    limitations: 'CPU saturation is a performance bottleneck, NOT inherently a security incident; must be interpreted using process context.',
    digitalTwinRelevance: 'Digital Twin evaluates whether high CPU is caused by user development/gaming (normal) or unverified background tasks (suspicious).',
    recommendedResponse: 'Inspect top CPU consumers in Process Monitor, adjust process priority/affinity, optimize parallel tasks.'
  },
  {
    id: 'disk_bottleneck',
    name: 'Disk I/O Bottleneck',
    category: 'System Bottlenecks',
    whatItIs: 'Storage throughput or IOPS saturation causing queue backlogs and blocking process I/O requests.',
    behavior: 'Extensive page swapping, heavy database writes, or massive file transfers overwhelming storage controller buffers.',
    indicators: 'Sustained high disk read/write throughput, high I/O wait times, system freezes during file operations.',
    detectableTelemetry: 'High disk read/write rates, elevated swap pagefaults, processes entering uninterruptible sleep state.',
    limitations: 'NVMe vs HDD storage have radically different throughput ceilings; Digital Twin learns host-specific disk baseline.',
    digitalTwinRelevance: 'Digital Twin baseline models host storage speed and differentiates normal burst activity from continuous saturation.',
    recommendedResponse: 'Identify heavy I/O processes in Process Monitor, schedule large transfers during off-hours, consider storage upgrade.'
  },
  {
    id: 'thermal_throttle',
    name: 'Thermal Throttling',
    category: 'System Bottlenecks',
    whatItIs: 'Hardware safety mechanism that automatically reduces processor clock frequency when core temperatures exceed critical thresholds.',
    behavior: 'CPU frequency drops significantly under heavy load, causing sharp performance degradation despite high compute demand.',
    indicators: 'Elevated CPU core temperatures (85-95°C+), sudden drop in current CPU frequency below base clock under load.',
    detectableTelemetry: 'High CPU temperature sensor readings, reduced CPU frequency metrics, high resource utilization.',
    limitations: 'Temperature sensor availability is platform-dependent; displays "Unavailable on this system" where sensors are unsupported.',
    digitalTwinRelevance: 'Correlates temperature telemetry with workload context; interprets elevated thermals alongside compute intensity.',
    recommendedResponse: 'Inspect cooling hardware and fan operation, clean heatsinks, verify adequate airflow, check thermal paste.'
  },
  {
    id: 'res_exhaustion',
    name: 'Compound Resource Exhaustion',
    category: 'System Bottlenecks',
    whatItIs: 'Severe system state where CPU, RAM, and Disk I/O are simultaneously saturated, threatening operating system stability.',
    behavior: 'Thrashing, massive swap page faulting, unresponsive user input, potential kernel panic or Blue Screen of Death.',
    indicators: 'CPU > 95%, RAM > 95%, Disk I/O saturated simultaneously, high process thread counts.',
    detectableTelemetry: 'Compound heuristic trigger: RESOURCE_EXHAUSTION rule, critical risk score contribution.',
    limitations: 'Requires distinguishing legitimate stress testing / benchmarking from runaway runaway fork bombs or infinite loops.',
    digitalTwinRelevance: 'The heuristic engine triggers the critical RESOURCE_EXHAUSTION alert to notify administrators before system freeze.',
    recommendedResponse: 'Identify resource-monopolizing process group, gracefully terminate non-critical services, assess system capacity.'
  }
];

export const ThreatKnowledge: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('ransomware');

  const filtered = threatDatabase.filter((t) => {
    const matchCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.whatItIs.toLowerCase().includes(search.toLowerCase()) ||
      t.behavior.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-glow-cyan/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  THREAT & BEHAVIORAL KNOWLEDGE ENCYCLOPEDIA
                </h1>
                <Tooltip content="Comprehensive encyclopedic reference covering 22+ malware families, attack patterns, and system bottlenecks with Digital Twin relevance." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Detailed behavioral characteristics, detectable telemetric signatures, detection limits, and recommended response procedures
              </p>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search threat encyclopedia (e.g. ransomware, memory leak, brute force)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800/90 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {['ALL', 'Malware', 'Attacks', 'System Bottlenecks'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Encyclopedia List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-12 text-center">
            <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300 font-mono">No threat vectors found matching your search</p>
            <p className="text-xs text-slate-500 mt-1">Try refining query keywords or category selection</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 transition-all"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                      item.category === 'Malware'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                        : item.category === 'Attacks'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
                    }`}>
                      {item.category}
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight font-mono">{item.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-sans font-medium">{item.whatItIs}</p>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0 border border-slate-700/60">
                      <ChevronUp className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-950/60 flex items-center justify-center text-slate-500 shrink-0 hover:text-slate-300 border border-slate-800">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-6 pt-2 border-t border-slate-800/80 space-y-4 text-xs bg-slate-950/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                        <span className="font-mono font-bold text-cyan-400 uppercase text-[10px] block tracking-wide">What It Is:</span>
                        <p className="text-slate-300 leading-relaxed font-sans font-medium">{item.whatItIs}</p>
                      </div>

                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                        <span className="font-mono font-bold text-indigo-400 uppercase text-[10px] block tracking-wide">System Behavioral Mechanics:</span>
                        <p className="text-slate-300 leading-relaxed font-sans font-medium">{item.behavior}</p>
                      </div>

                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                        <span className="font-mono font-bold text-cyan-300 uppercase text-[10px] block tracking-wide">Detectable Telemetric Signatures:</span>
                        <p className="text-slate-300 leading-relaxed font-sans font-medium">{item.detectableTelemetry}</p>
                      </div>

                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                        <span className="font-mono font-bold text-amber-400 uppercase text-[10px] block tracking-wide">Detection Limitations:</span>
                        <p className="text-slate-300 leading-relaxed font-sans font-medium">{item.limitations}</p>
                      </div>
                    </div>

                    <div className="bg-cyan-950/20 border border-cyan-800/40 p-4 rounded-xl space-y-1.5">
                      <span className="font-mono font-bold text-cyan-300 uppercase text-[10px] block tracking-wide">Digital Twin Relevance:</span>
                      <p className="text-cyan-100/90 leading-relaxed font-sans font-medium">{item.digitalTwinRelevance}</p>
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl space-y-1.5">
                      <span className="font-mono font-bold text-emerald-400 uppercase text-[10px] block tracking-wide">Recommended Security Analyst Response:</span>
                      <p className="text-emerald-200/90 leading-relaxed font-sans font-medium">{item.recommendedResponse}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ThreatKnowledge;

